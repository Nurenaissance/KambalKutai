import { WebSocketServer } from "ws";

const PORT = Number(process.env.PORT || 8787);
const HEARTBEAT_INTERVAL = 30000;

const wss = new WebSocketServer({ port: PORT });
const rooms = new Map();
let waitingPlayer = null;

function send(socket, message) {
  if (socket.readyState === socket.OPEN) {
    socket.send(JSON.stringify(message));
  }
}

function broadcast(room, message, except = null) {
  room.players.forEach((player) => {
    if (player !== except) {
      send(player, message);
    }
  });
}

function leaveRoom(socket) {
  if (waitingPlayer === socket) {
    waitingPlayer = null;
  }

  const roomId = socket.roomId;
  if (!roomId) {
    return;
  }

  const room = rooms.get(roomId);
  if (!room) {
    return;
  }

  broadcast(room, { type: "opponent_left" }, socket);
  rooms.delete(roomId);
  room.players.forEach((player) => {
    player.roomId = null;
    player.playerIndex = null;
  });
}

function createRoom(firstPlayer, secondPlayer) {
  const roomId = crypto.randomUUID();
  const room = {
    id: roomId,
    players: [firstPlayer, secondPlayer],
    createdAt: Date.now(),
  };

  rooms.set(roomId, room);

  room.players.forEach((player, playerIndex) => {
    player.roomId = roomId;
    player.playerIndex = playerIndex;
    send(player, {
      type: "matched",
      roomId,
      playerIndex,
      host: playerIndex === 0,
    });
  });
}

function handleMessage(socket, rawMessage) {
  let message;
  try {
    message = JSON.parse(rawMessage.toString());
  } catch {
    send(socket, { type: "error", message: "Invalid message JSON." });
    return;
  }

  if (message.type === "find_match") {
    leaveRoom(socket);

    if (waitingPlayer && waitingPlayer !== socket && waitingPlayer.readyState === waitingPlayer.OPEN) {
      const firstPlayer = waitingPlayer;
      waitingPlayer = null;
      createRoom(firstPlayer, socket);
      return;
    }

    waitingPlayer = socket;
    send(socket, { type: "waiting" });
    return;
  }

  if (message.type === "cancel_match") {
    if (waitingPlayer === socket) {
      waitingPlayer = null;
    }
    send(socket, { type: "idle" });
    return;
  }

  const room = rooms.get(socket.roomId);
  if (!room) {
    send(socket, { type: "error", message: "You are not in a match." });
    return;
  }

  if (message.type === "input") {
    broadcast(
      room,
      {
        type: "input",
        playerIndex: socket.playerIndex,
        input: message.input,
      },
      socket,
    );
    return;
  }

  if (message.type === "state" || message.type === "reset" || message.type === "level") {
    if (socket.playerIndex !== 0) {
      return;
    }
    broadcast(room, message, socket);
  }
}

wss.on("connection", (socket) => {
  socket.isAlive = true;
  socket.on("pong", () => {
    socket.isAlive = true;
  });
  socket.on("message", (message) => handleMessage(socket, message));
  socket.on("close", () => leaveRoom(socket));
  socket.on("error", () => leaveRoom(socket));
});

setInterval(() => {
  wss.clients.forEach((socket) => {
    if (!socket.isAlive) {
      leaveRoom(socket);
      socket.terminate();
      return;
    }

    socket.isAlive = false;
    socket.ping();
  });
}, HEARTBEAT_INTERVAL);

console.log(`Matchmaker listening on ws://localhost:${PORT}`);
