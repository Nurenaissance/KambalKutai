import { useEffect, useRef, useState } from "react";

const ARENA = {
  width: 980,
  height: 580,
  floorY: 470,
};

const LEVELS = [
  {
    id: 1,
    title: "Level 1: Pillow Duel",
    weapon: "Pillow",
    description: "Soft pillows can be swung up close or thrown across the room.",
    attackDamage: 14,
    attackRange: 90,
    cooldown: 420,
    projectileDamage: 12,
    projectileSpeed: 470,
    projectileCooldown: 820,
    blockReduction: 0.45,
    accent: "#d0b38b",
  },
  {
    id: 2,
    title: "Level 2: Bedsheet Bash",
    weapon: "Bedsheet",
    description: "Bedsheets spread wider, shield more, and hit harder in the air.",
    attackDamage: 18,
    attackRange: 122,
    cooldown: 560,
    projectileDamage: 16,
    projectileSpeed: 420,
    projectileCooldown: 950,
    blockReduction: 0.32,
    accent: "#a1b8bf",
  },
];

const CHARACTER_DEFS = [
  {
    key: "advit",
    name: "Advit",
    outfit: "#b85042",
    hair: "#2f2017",
    accent: "#c2847a",
    controls: {
      left: "a",
      right: "d",
      jump: "w",
      attack: "f",
      throw: "g",
      guard: "s",
    },
  },
  {
    key: "adarsh",
    name: "Adarsh",
    outfit: "#486581",
    hair: "#1c2338",
    accent: "#6f9ab6",
    controls: {
      left: "j",
      right: "l",
      jump: "i",
      attack: "h",
      throw: "k",
      guard: "u",
    },
  },
];

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function createFighter(def, x, facing) {
  return {
    ...def,
    x,
    y: ARENA.floorY,
    vx: 0,
    vy: 0,
    width: 68,
    height: 126,
    facing,
    hp: 100,
    attackTimer: 0,
    cooldownTimer: 0,
    projectileCooldownTimer: 0,
    guardMeter: 100,
    guardBrokenTimer: 0,
    isGuarding: false,
    entrappedTimer: 0,
    downedTimer: 0,
    hitFlash: 0,
    score: 0,
  };
}

function createInitialState() {
  return {
    fighters: [
      createFighter(CHARACTER_DEFS[0], 200, 1),
      createFighter(CHARACTER_DEFS[1], 720, -1),
    ],
    projectiles: [],
  };
}

function applyDamage(target, damage, level) {
  const guarded = target.isGuarding && target.guardBrokenTimer <= 0;
  const actualDamage = guarded ? Math.max(2, Math.round(damage * level.blockReduction)) : damage;
  target.hp = Math.max(0, target.hp - actualDamage);
  target.hitFlash = 220;

  if (guarded) {
    target.guardMeter = Math.max(0, target.guardMeter - damage * 1.8);
    if (target.guardMeter === 0) {
      target.guardBrokenTimer = 1200;
      target.isGuarding = false;
    }
  }

  return actualDamage;
}

function knockDown(target, duration) {
  target.downedTimer = Math.max(target.downedTimer, duration);
  target.entrappedTimer = Math.max(target.entrappedTimer, duration * 0.8);
  target.isGuarding = false;
  target.vx = 0;
  target.vy = 0;
  target.y = ARENA.floorY;
}

function drawRoundedRect(ctx, x, y, width, height, radius) {
  ctx.beginPath();
  ctx.roundRect(x, y, width, height, radius);
}

function drawWeapon(ctx, weapon, x, y, rotation, airborne = false) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rotation);

  if (weapon === "Bedsheet") {
    const sheetGradient = ctx.createLinearGradient(-34, -12, 34, 14);
    sheetGradient.addColorStop(0, "#f0e8d8");
    sheetGradient.addColorStop(0.5, "#fbf7ef");
    sheetGradient.addColorStop(1, "#c9d8df");
    ctx.fillStyle = sheetGradient;
    ctx.strokeStyle = "#b4c1ca";
    ctx.lineWidth = 2;
    drawRoundedRect(ctx, -34, -18, 68, 36, 14);
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = "rgba(122, 151, 168, 0.8)";
    ctx.beginPath();
    ctx.moveTo(-20, -6);
    ctx.quadraticCurveTo(0, 10, 22, -4);
    ctx.stroke();
  } else {
    const pillowGradient = ctx.createLinearGradient(-24, -16, 24, 14);
    pillowGradient.addColorStop(0, "#fffdf7");
    pillowGradient.addColorStop(0.5, "#faf2e4");
    pillowGradient.addColorStop(1, "#d3c5b1");
    ctx.fillStyle = pillowGradient;
    ctx.strokeStyle = "#d7cab9";
    ctx.lineWidth = 2;
    drawRoundedRect(ctx, -24, -16, 48, 32, 14);
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = "rgba(180, 155, 128, 0.8)";
    ctx.beginPath();
    ctx.moveTo(-10, -10);
    ctx.quadraticCurveTo(0, 0, -8, 10);
    ctx.moveTo(10, -8);
    ctx.quadraticCurveTo(2, 0, 10, 10);
    ctx.stroke();
  }

  if (airborne) {
    ctx.strokeStyle = "rgba(255,255,255,0.35)";
    ctx.beginPath();
    ctx.arc(0, 0, weapon === "Bedsheet" ? 42 : 30, 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.restore();
}

function drawFighter(ctx, fighter, weapon, isWinner) {
  const baseY = fighter.y - fighter.height;
  const direction = fighter.facing;
  const flashAlpha = fighter.hitFlash > 0 ? 0.25 : 0;
  const downed = fighter.downedTimer > 0;

  ctx.save();
  ctx.translate(fighter.x, downed ? fighter.y - 54 : baseY);

  ctx.fillStyle = "rgba(0, 0, 0, 0.2)";
  ctx.beginPath();
  ctx.ellipse(fighter.width / 2, downed ? 64 : fighter.height + 7, downed ? 42 : 34, downed ? 13 : 11, 0, 0, Math.PI * 2);
  ctx.fill();

  if (flashAlpha) {
    ctx.fillStyle = `rgba(255, 255, 255, ${flashAlpha})`;
    ctx.fillRect(-12, 2, fighter.width + 28, downed ? 62 : fighter.height + 4);
  }

  if (downed) {
    ctx.save();
    ctx.translate(34, 38);
    ctx.rotate(direction * -0.16);

    const skinGradient = ctx.createLinearGradient(-8, -16, 20, 16);
    skinGradient.addColorStop(0, "#f2c9a5");
    skinGradient.addColorStop(1, "#cc9874");
    ctx.fillStyle = skinGradient;
    ctx.beginPath();
    ctx.arc(28, -8, 16, 0, Math.PI * 2);
    ctx.fill();

    const shirtGradient = ctx.createLinearGradient(-12, 0, 52, 28);
    shirtGradient.addColorStop(0, fighter.accent);
    shirtGradient.addColorStop(1, fighter.outfit);
    ctx.fillStyle = shirtGradient;
    drawRoundedRect(ctx, -4, -2, 58, 24, 10);
    ctx.fill();

    ctx.fillStyle = "#7a5230";
    drawRoundedRect(ctx, 46, 1, 24, 10, 5);
    ctx.fill();
    drawRoundedRect(ctx, -18, 4, 22, 9, 5);
    ctx.fill();

    ctx.strokeStyle = "#2e2824";
    ctx.lineWidth = 5;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(4, 8);
    ctx.lineTo(-10, 16);
    ctx.moveTo(46, 8);
    ctx.lineTo(66, 16);
    ctx.moveTo(18, 20);
    ctx.lineTo(6, 34);
    ctx.moveTo(40, 20);
    ctx.lineTo(54, 34);
    ctx.stroke();

    if (fighter.entrappedTimer > 0) {
      ctx.fillStyle = "rgba(240, 232, 216, 0.9)";
      drawRoundedRect(ctx, -8, -10, 74, 34, 12);
      ctx.fill();
      ctx.strokeStyle = "#bbc8cf";
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-2, -2);
      ctx.quadraticCurveTo(14, 12, 28, 0);
      ctx.moveTo(24, -4);
      ctx.quadraticCurveTo(38, 10, 52, -2);
      ctx.stroke();
    }

    ctx.restore();
  } else {
    const skinGradient = ctx.createLinearGradient(18, 0, 46, 46);
    skinGradient.addColorStop(0, "#f2c9a5");
    skinGradient.addColorStop(1, "#cc9874");
    ctx.fillStyle = skinGradient;
    ctx.beginPath();
    ctx.arc(fighter.width / 2, 24, 19, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = fighter.hair;
    ctx.beginPath();
    ctx.arc(fighter.width / 2, 18, 20, Math.PI, Math.PI * 2);
    ctx.fill();
    ctx.fillRect(16, 18, 8, 10);
    ctx.fillRect(44, 18, 8, 10);

    ctx.fillStyle = "#2f221b";
    ctx.fillRect(25, 29, 5, 2);
    ctx.fillRect(39, 29, 5, 2);
    ctx.beginPath();
    ctx.arc(34, 38, 6, 0.2, Math.PI - 0.2);
    ctx.strokeStyle = "#81533b";
    ctx.lineWidth = 2;
    ctx.stroke();

    const neckGradient = ctx.createLinearGradient(28, 34, 40, 46);
    neckGradient.addColorStop(0, "#dbac87");
    neckGradient.addColorStop(1, "#c48f68");
    ctx.fillStyle = neckGradient;
    drawRoundedRect(ctx, 28, 38, 12, 10, 4);
    ctx.fill();

    const shirtGradient = ctx.createLinearGradient(16, 40, 58, 106);
    shirtGradient.addColorStop(0, fighter.accent);
    shirtGradient.addColorStop(1, fighter.outfit);
    ctx.fillStyle = shirtGradient;
    drawRoundedRect(ctx, 14, 42, 40, 54, 12);
    ctx.fill();

    ctx.fillStyle = "#35506d";
    drawRoundedRect(ctx, 18, 94, 15, 27, 7);
    ctx.fill();
    drawRoundedRect(ctx, 35, 94, 15, 27, 7);
    ctx.fill();

    ctx.strokeStyle = "#2e2824";
    ctx.lineWidth = 7;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(20, 56);
    ctx.lineTo(10, 74);
    ctx.moveTo(48, 56);
    ctx.lineTo(58 + 8 * direction, 74);
    ctx.moveTo(24, 98);
    ctx.lineTo(18, 120);
    ctx.moveTo(44, 98);
    ctx.lineTo(50, 120);
    ctx.stroke();

    const attackExtension = fighter.attackTimer > 0 ? 34 : 16;
    const guardRotation = fighter.isGuarding ? direction * -0.7 : direction * 0.08;
    const armX = 38 + (fighter.isGuarding ? 12 : attackExtension) * direction;
    const armY = fighter.isGuarding ? 56 : 68;
    drawWeapon(
      ctx,
      weapon,
      armX,
      armY,
      fighter.attackTimer > 0 ? direction * 0.28 : guardRotation,
    );

    if (fighter.isGuarding) {
      ctx.strokeStyle = "rgba(200, 232, 255, 0.7)";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(34 + 24 * direction, 60, 30, -1.1, 1.1);
      ctx.stroke();
    }

    if (fighter.entrappedTimer > 0) {
      ctx.fillStyle = "rgba(240, 232, 216, 0.8)";
      drawRoundedRect(ctx, 8, 42, 54, 56, 16);
      ctx.fill();
      ctx.strokeStyle = "#bbc8cf";
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  }

  ctx.fillStyle = "#211817";
  ctx.font = "700 14px Trebuchet MS, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(fighter.name, 34, -8);

  if (isWinner) {
    ctx.fillStyle = "#f6d365";
    ctx.fillText("Winner", 34, -28);
  }

  ctx.restore();
}

function drawProjectile(ctx, projectile) {
  drawWeapon(
    ctx,
    projectile.type,
    projectile.x,
    projectile.y,
    projectile.rotation,
    true,
  );
}

function drawArena(ctx, level) {
  const wall = ctx.createLinearGradient(0, 0, 0, ARENA.floorY);
  wall.addColorStop(0, "#d8c7ae");
  wall.addColorStop(0.52, "#cdb89c");
  wall.addColorStop(1, "#b39070");
  ctx.fillStyle = wall;
  ctx.fillRect(0, 0, ARENA.width, ARENA.floorY);

  ctx.fillStyle = "rgba(255, 244, 223, 0.7)";
  ctx.fillRect(54, 46, 230, 142);
  const glass = ctx.createLinearGradient(54, 46, 284, 188);
  glass.addColorStop(0, "rgba(169, 210, 238, 0.72)");
  glass.addColorStop(1, "rgba(89, 143, 181, 0.8)");
  ctx.fillStyle = glass;
  ctx.fillRect(72, 64, 194, 106);
  ctx.strokeStyle = "#efe5d1";
  ctx.lineWidth = 10;
  ctx.strokeRect(62, 54, 214, 126);
  ctx.beginPath();
  ctx.moveTo(169, 54);
  ctx.lineTo(169, 180);
  ctx.moveTo(62, 117);
  ctx.lineTo(276, 117);
  ctx.stroke();

  ctx.fillStyle = "#f3d8b8";
  ctx.beginPath();
  ctx.moveTo(60, 46);
  ctx.lineTo(96, 24);
  ctx.lineTo(242, 24);
  ctx.lineTo(278, 46);
  ctx.closePath();
  ctx.fill();

  const wardrobe = ctx.createLinearGradient(0, 250, 0, 458);
  wardrobe.addColorStop(0, "#8b5e3c");
  wardrobe.addColorStop(1, "#5d3921");
  ctx.fillStyle = wardrobe;
  drawRoundedRect(ctx, 90, 250, 132, 208, 10);
  ctx.fill();
  ctx.strokeStyle = "#4a2d19";
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(156, 258);
  ctx.lineTo(156, 452);
  ctx.stroke();
  ctx.fillStyle = "#d6b07a";
  ctx.beginPath();
  ctx.arc(146, 356, 4, 0, Math.PI * 2);
  ctx.arc(166, 356, 4, 0, Math.PI * 2);
  ctx.fill();

  const bedFrame = ctx.createLinearGradient(580, 300, 880, 448);
  bedFrame.addColorStop(0, "#84563a");
  bedFrame.addColorStop(1, "#59351f");
  ctx.fillStyle = bedFrame;
  drawRoundedRect(ctx, 590, 302, 292, 110, 12);
  ctx.fill();
  ctx.fillRect(608, 408, 14, 54);
  ctx.fillRect(846, 408, 14, 54);

  const mattress = ctx.createLinearGradient(610, 282, 860, 360);
  mattress.addColorStop(0, "#fbf7f2");
  mattress.addColorStop(1, "#dbd7d1");
  ctx.fillStyle = mattress;
  drawRoundedRect(ctx, 606, 276, 260, 82, 20);
  ctx.fill();
  ctx.fillStyle = "#d8ded9";
  drawRoundedRect(ctx, 620, 316, 232, 46, 14);
  ctx.fill();

  ctx.fillStyle = "#f5ebdb";
  drawRoundedRect(ctx, 628, 286, 84, 26, 12);
  ctx.fill();
  drawRoundedRect(ctx, 746, 286, 84, 26, 12);
  ctx.fill();

  ctx.fillStyle = "#7e6148";
  drawRoundedRect(ctx, 420, 330, 104, 102, 8);
  ctx.fill();
  ctx.fillStyle = "#e4c79f";
  ctx.fillRect(430, 298, 84, 34);
  ctx.fillStyle = "#f7efe2";
  ctx.beginPath();
  ctx.arc(472, 314, 14, 0, Math.PI * 2);
  ctx.fill();

  const floor = ctx.createLinearGradient(0, ARENA.floorY, 0, ARENA.height);
  floor.addColorStop(0, "#8d6243");
  floor.addColorStop(1, "#4c3326");
  ctx.fillStyle = floor;
  ctx.fillRect(0, ARENA.floorY, ARENA.width, ARENA.height - ARENA.floorY);

  ctx.strokeStyle = "rgba(56, 34, 23, 0.45)";
  ctx.lineWidth = 2;
  for (let x = 0; x < ARENA.width; x += 52) {
    ctx.beginPath();
    ctx.moveTo(x, ARENA.floorY);
    ctx.lineTo(x + 26, ARENA.height);
    ctx.stroke();
  }

  const rug = ctx.createLinearGradient(260, 420, 630, 495);
  rug.addColorStop(0, "#8b2f2f");
  rug.addColorStop(0.5, level.accent);
  rug.addColorStop(1, "#6b3f2e");
  ctx.fillStyle = rug;
  drawRoundedRect(ctx, 248, 424, 400, 64, 28);
  ctx.fill();
  ctx.strokeStyle = "rgba(255, 240, 220, 0.4)";
  ctx.lineWidth = 3;
  ctx.stroke();

  ctx.fillStyle = "rgba(255,255,255,0.18)";
  ctx.font = "700 36px Georgia, serif";
  ctx.textAlign = "center";
  ctx.fillText("Kambal Pitai", ARENA.width / 2, 54);
  ctx.font = "600 17px Trebuchet MS, sans-serif";
  ctx.fillText(level.title, ARENA.width / 2, 80);
}

const MATCHMAKER_URL =
  import.meta.env.VITE_MATCHMAKER_URL ||
  `${window.location.protocol === "https:" ? "wss" : "ws"}://${window.location.hostname}:8787`;

const EMPTY_INPUT = {
  left: false,
  right: false,
  jump: false,
  attack: false,
  throw: false,
  guard: false,
};

const ONLINE_KEY_TO_ACTION = {
  a: "left",
  arrowleft: "left",
  d: "right",
  arrowright: "right",
  w: "jump",
  arrowup: "jump",
  f: "attack",
  j: "attack",
  g: "throw",
  k: "throw",
  s: "guard",
  arrowdown: "guard",
};

const LOCAL_PLAYER_ONE_KEYS = {
  a: "left",
  d: "right",
  w: "jump",
  f: "attack",
  g: "throw",
  s: "guard",
};

const LOCAL_PLAYER_TWO_KEYS = {
  j: "left",
  l: "right",
  i: "jump",
  h: "attack",
  k: "throw",
  u: "guard",
};

const MOBILE_CONTROLS = [
  { action: "left", label: "Left" },
  { action: "right", label: "Right" },
  { action: "jump", label: "Jump" },
  { action: "guard", label: "Guard" },
  { action: "attack", label: "Swing" },
  { action: "throw", label: "Throw" },
];

function cloneInput(input = EMPTY_INPUT) {
  return { ...EMPTY_INPUT, ...input };
}

function createInputState() {
  return [cloneInput(), cloneInput()];
}

export default function App() {
  const canvasRef = useRef(null);
  const keysRef = useRef(new Set());
  const socketRef = useRef(null);
  const inputStatesRef = useRef(createInputState());
  const lastTimeRef = useRef(0);
  const lastSnapshotSentRef = useRef(0);
  const playerIndexRef = useRef(0);
  const [levelIndex, setLevelIndex] = useState(0);
  const [gameState, setGameState] = useState(createInitialState);
  const [winner, setWinner] = useState(null);
  const [round, setRound] = useState(1);
  const [playMode, setPlayMode] = useState("idle");
  const [connectionStatus, setConnectionStatus] = useState("idle");
  const [onlineMessage, setOnlineMessage] = useState("");
  const [roomId, setRoomId] = useState("");
  const [playerIndex, setPlayerIndex] = useState(0);

  const level = LEVELS[levelIndex];
  const { fighters, projectiles } = gameState;
  const localFighter = fighters[playerIndex];
  const isOnline = playMode === "online" || connectionStatus === "waiting";
  const isHost = playMode === "offline" || (playMode === "online" && playerIndex === 0);

  function sendSocketMessage(message) {
    const socket = socketRef.current;
    if (socket?.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify(message));
    }
  }

  function updateLocalInput(action, pressed, targetIndex = playerIndexRef.current) {
    const index = targetIndex;
    inputStatesRef.current[index] = {
      ...inputStatesRef.current[index],
      [action]: pressed,
    };

    if (playMode === "online" && index === playerIndexRef.current) {
      sendSocketMessage({
        type: "input",
        input: inputStatesRef.current[index],
      });
    }
  }

  function clearInputs() {
    keysRef.current.clear();
    inputStatesRef.current = createInputState();
  }

  function applyRemoteSnapshot(snapshot) {
    if (!snapshot) {
      return;
    }

    if (typeof snapshot.levelIndex === "number") {
      setLevelIndex(snapshot.levelIndex);
    }
    if (typeof snapshot.round === "number") {
      setRound(snapshot.round);
    }
    setWinner(snapshot.winner ?? null);
    if (snapshot.gameState) {
      setGameState(snapshot.gameState);
    }
    lastTimeRef.current = 0;
  }

  function startOfflineGame() {
    clearInputs();
    playerIndexRef.current = 0;
    setPlayerIndex(0);
    setConnectionStatus("idle");
    setOnlineMessage("");
    setRoomId("");
    setPlayMode("offline");
    resetRound(0, 1, false);
  }

  function startOnlineGame() {
    clearInputs();
    setPlayMode("idle");
    setConnectionStatus("connecting");
    setOnlineMessage("Connecting to the matchmaker...");
    setRoomId("");
    setWinner(null);
    setGameState(createInitialState());
    lastTimeRef.current = 0;

    if (socketRef.current) {
      const previousSocket = socketRef.current;
      socketRef.current = null;
      previousSocket.close();
    }
    const socket = new WebSocket(MATCHMAKER_URL);
    socketRef.current = socket;

    socket.addEventListener("open", () => {
      setConnectionStatus("waiting");
      setOnlineMessage("Looking for another player...");
      sendSocketMessage({ type: "find_match" });
    });

    socket.addEventListener("message", (event) => {
      let message;
      try {
        message = JSON.parse(event.data);
      } catch {
        return;
      }

      if (message.type === "waiting") {
        setConnectionStatus("waiting");
        setOnlineMessage("Waiting for an opponent...");
        return;
      }

      if (message.type === "matched") {
        clearInputs();
        playerIndexRef.current = message.playerIndex;
        setPlayerIndex(message.playerIndex);
        setRoomId(message.roomId);
        setPlayMode("online");
        setConnectionStatus("matched");
        setOnlineMessage(
          message.playerIndex === 0
            ? "Matched. You are hosting the round."
            : "Matched. Your opponent is hosting the round.",
        );
        resetRound(0, 1, false);
        return;
      }

      if (message.type === "input" && message.playerIndex === 1 && playerIndexRef.current === 0) {
        inputStatesRef.current[message.playerIndex] = cloneInput(message.input);
        return;
      }

      if (message.type === "state" && playerIndexRef.current !== 0) {
        applyRemoteSnapshot(message);
        return;
      }

      if (message.type === "reset") {
        applyRemoteSnapshot(message);
        return;
      }

      if (message.type === "opponent_left") {
        setConnectionStatus("disconnected");
        setOnlineMessage("Opponent left. Start again to find a new match.");
        setPlayMode("idle");
        clearInputs();
      }
    });

    socket.addEventListener("close", () => {
      if (socketRef.current === socket) {
        setConnectionStatus("disconnected");
        setOnlineMessage("Disconnected from the matchmaker.");
        setPlayMode("idle");
        socketRef.current = null;
      }
    });

    socket.addEventListener("error", () => {
      setConnectionStatus("disconnected");
      setOnlineMessage(`Could not connect to ${MATCHMAKER_URL}.`);
      setPlayMode("idle");
    });
  }

  function cancelOnlineSearch() {
    sendSocketMessage({ type: "cancel_match" });
    const socket = socketRef.current;
    socketRef.current = null;
    socket?.close();
    clearInputs();
    setConnectionStatus("idle");
    setOnlineMessage("");
    setPlayMode("idle");
  }

  useEffect(() => {
    function onKeyDown(event) {
      const key = event.key.toLowerCase();
      const isLocalTwoPlayer = playMode === "offline";
      const action = isLocalTwoPlayer
        ? LOCAL_PLAYER_ONE_KEYS[key] || LOCAL_PLAYER_TWO_KEYS[key]
        : ONLINE_KEY_TO_ACTION[key];
      if (!action) {
        return;
      }
      const targetIndex = isLocalTwoPlayer && LOCAL_PLAYER_TWO_KEYS[key] ? 1 : playerIndexRef.current;
      event.preventDefault();
      keysRef.current.add(key);
      updateLocalInput(action, true, targetIndex);
    }

    function onKeyUp(event) {
      const key = event.key.toLowerCase();
      const isLocalTwoPlayer = playMode === "offline";
      const action = isLocalTwoPlayer
        ? LOCAL_PLAYER_ONE_KEYS[key] || LOCAL_PLAYER_TWO_KEYS[key]
        : ONLINE_KEY_TO_ACTION[key];
      if (!action) {
        return;
      }
      const targetIndex = isLocalTwoPlayer && LOCAL_PLAYER_TWO_KEYS[key] ? 1 : playerIndexRef.current;
      event.preventDefault();
      keysRef.current.delete(key);
      updateLocalInput(action, false, targetIndex);
    }

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);

    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, [playMode]);

  useEffect(() => {
    return () => {
      socketRef.current?.close();
    };
  }, []);

  useEffect(() => {
    let frameId = 0;
    const gravity = 1800;
    const moveSpeed = 280;
    const jumpPower = 760;

    function step(timestamp) {
      if (!isHost || playMode === "idle" || connectionStatus === "waiting") {
        frameId = window.requestAnimationFrame(step);
        return;
      }

      if (!lastTimeRef.current) {
        lastTimeRef.current = timestamp;
      }
      const delta = Math.min((timestamp - lastTimeRef.current) / 1000, 0.024);
      lastTimeRef.current = timestamp;

      setGameState((current) => {
        const nextFighters = current.fighters.map((fighter) => ({ ...fighter }));
        const nextProjectiles = [];
        let nextWinner = winner;

        nextFighters.forEach((fighter, index) => {
          const input = inputStatesRef.current[index] ?? EMPTY_INPUT;
          const enemy = nextFighters[index === 0 ? 1 : 0];
          const horizontal = (input.right ? 1 : 0) - (input.left ? 1 : 0);

          const disabled = fighter.downedTimer > 0 || fighter.entrappedTimer > 0;
          fighter.isGuarding =
            !disabled && input.guard && fighter.guardBrokenTimer <= 0;
          const speedPenalty = fighter.isGuarding ? 0.4 : 1;
          fighter.vx = disabled ? 0 : horizontal * moveSpeed * speedPenalty;
          fighter.x = clamp(fighter.x + fighter.vx * delta, 20, ARENA.width - fighter.width - 20);

          if (horizontal !== 0 && !disabled) {
            fighter.facing = horizontal > 0 ? 1 : -1;
          }

          const grounded = fighter.y >= ARENA.floorY;
          if (input.jump && grounded && !fighter.isGuarding && !disabled) {
            fighter.vy = -jumpPower;
          }

          fighter.vy += gravity * delta;
          fighter.y = Math.min(ARENA.floorY, fighter.y + fighter.vy * delta);
          if (fighter.y >= ARENA.floorY) {
            fighter.vy = 0;
          }

          fighter.attackTimer = Math.max(0, fighter.attackTimer - delta * 1000);
          fighter.cooldownTimer = Math.max(0, fighter.cooldownTimer - delta * 1000);
          fighter.projectileCooldownTimer = Math.max(
            0,
            fighter.projectileCooldownTimer - delta * 1000,
          );
          fighter.hitFlash = Math.max(0, fighter.hitFlash - delta * 1000);
          fighter.guardBrokenTimer = Math.max(0, fighter.guardBrokenTimer - delta * 1000);
          fighter.entrappedTimer = Math.max(0, fighter.entrappedTimer - delta * 1000);
          fighter.downedTimer = Math.max(0, fighter.downedTimer - delta * 1000);

          if (fighter.guardBrokenTimer <= 0) {
            fighter.guardMeter = clamp(
              fighter.guardMeter + (fighter.isGuarding ? 10 : 18) * delta,
              0,
              100,
            );
          }

          if (
            !winner &&
            !fighter.isGuarding &&
            !disabled &&
            input.attack &&
            fighter.cooldownTimer <= 0
          ) {
            fighter.attackTimer = 180;
            fighter.cooldownTimer = level.cooldown;
            const distance = enemy.x - fighter.x;
            const inFront = Math.sign(distance || fighter.facing) === fighter.facing;
            const inRange = Math.abs(distance) < level.attackRange;
            const heightClose = Math.abs(enemy.y - fighter.y) < 60;

            if (inFront && inRange && heightClose) {
              applyDamage(enemy, level.attackDamage, level);
              if (level.weapon === "Bedsheet") {
                knockDown(enemy, 900);
              }
              if (enemy.hp === 0) {
                fighter.score += 1;
              }
            }
          }

          if (
            !winner &&
            !fighter.isGuarding &&
            !disabled &&
            input.throw &&
            fighter.projectileCooldownTimer <= 0
          ) {
            fighter.projectileCooldownTimer = level.projectileCooldown;
            nextProjectiles.push({
              id: `${fighter.key}-${timestamp}-${index}`,
              owner: fighter.key,
              type: level.weapon,
              x: fighter.x + fighter.width / 2 + fighter.facing * 28,
              y: fighter.y - 74,
              vx: fighter.facing * level.projectileSpeed,
              vy: level.weapon === "Bedsheet" ? -130 : -90,
              radius: level.weapon === "Bedsheet" ? 30 : 22,
              damage: level.projectileDamage,
              rotation: 0,
            });
          }
        });

        current.projectiles.forEach((projectile) => {
          const nextProjectile = {
            ...projectile,
            x: projectile.x + projectile.vx * delta,
            y: projectile.y + projectile.vy * delta,
            vy: projectile.vy + 420 * delta,
            rotation: projectile.rotation + delta * 6,
          };

          if (
            nextProjectile.x < -80 ||
            nextProjectile.x > ARENA.width + 80 ||
            nextProjectile.y > ARENA.floorY + 30
          ) {
            return;
          }

          const target = nextFighters.find((fighter) => fighter.key !== nextProjectile.owner);
          if (target) {
            const targetCenterX = target.x + target.width / 2;
            const targetCenterY = target.y - target.height / 2;
            const distanceX = Math.abs(targetCenterX - nextProjectile.x);
            const distanceY = Math.abs(targetCenterY - nextProjectile.y);
            const hit =
              distanceX < target.width / 2 + nextProjectile.radius &&
              distanceY < target.height / 2;

            if (hit) {
              applyDamage(target, nextProjectile.damage, level);
              if (nextProjectile.type === "Bedsheet") {
                knockDown(target, 1600);
              }
              const owner = nextFighters.find((fighter) => fighter.key === nextProjectile.owner);
              if (target.hp === 0 && owner) {
                owner.score += 1;
              }
              return;
            }
          }

          nextProjectiles.push(nextProjectile);
        });

        if (!winner) {
          const defeated = nextFighters.find((fighter) => fighter.hp <= 0);
          if (defeated) {
            const victor = nextFighters.find((fighter) => fighter.hp > 0);
            nextWinner = victor?.key ?? "draw";
            setWinner(nextWinner);
          }
        }

        const nextState = {
          fighters: nextFighters,
          projectiles: nextProjectiles,
        };

        if (
          playMode === "online" &&
          playerIndexRef.current === 0 &&
          timestamp - lastSnapshotSentRef.current > 33
        ) {
          lastSnapshotSentRef.current = timestamp;
          sendSocketMessage({
            type: "state",
            gameState: nextState,
            levelIndex,
            winner: nextWinner,
            round,
          });
        }

        return nextState;
      });

      frameId = window.requestAnimationFrame(step);
    }

    frameId = window.requestAnimationFrame(step);
    return () => {
      window.cancelAnimationFrame(frameId);
      lastTimeRef.current = 0;
    };
  }, [connectionStatus, isHost, level, levelIndex, playMode, round, winner]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    drawArena(ctx, level);
    projectiles.forEach((projectile) => drawProjectile(ctx, projectile));
    fighters.forEach((fighter) => {
      drawFighter(ctx, fighter, level.weapon, winner === fighter.key);
    });
  }, [fighters, level, projectiles, winner]);

  function resetRound(nextLevelIndex = levelIndex, nextRound = round, notifyOpponent = true) {
    const nextState = createInitialState();
    setLevelIndex(nextLevelIndex);
    setRound(nextRound);
    setWinner(null);
    setGameState(nextState);
    lastTimeRef.current = 0;
    lastSnapshotSentRef.current = 0;
    clearInputs();

    if (notifyOpponent && playMode === "online" && playerIndexRef.current === 0) {
      sendSocketMessage({
        type: "reset",
        gameState: nextState,
        levelIndex: nextLevelIndex,
        winner: null,
        round: nextRound,
      });
    }
  }

  function advanceLevel() {
    const newLevel = (levelIndex + 1) % LEVELS.length;
    resetRound(newLevel, round + 1);
  }

  const rosterText = `${CHARACTER_DEFS.map((fighter) => fighter.name).join(", ")} and Daivik`;
  const showStartOverlay = playMode === "idle";
  const showWaitingOverlay = connectionStatus === "connecting" || connectionStatus === "waiting";

  return (
    <div className="app-shell">
      <section className="hero-panel">
        <div>
          <p className="eyebrow">Bedroom Arena Prototype</p>
          <h1>Kambal Pitai</h1>
          <p className="hero-copy">
            A more physical room fight where pillows and bedsheets can be swung,
            thrown, and raised for protection. Advit and Adarsh are playable now,
            with Daivik ready for the next character pass.
          </p>
        </div>
        <div className="hero-card">
          <strong>Current roster</strong>
          <span>{rosterText}</span>
          <strong>Level theme</strong>
          <span>{level.title}</span>
          <strong>Combat layer</strong>
          <span>Melee, projectile throws, and active guarding.</span>
        </div>
      </section>

      <section className="game-layout">
        <div className="canvas-wrap">
          <canvas
            ref={canvasRef}
            width={ARENA.width}
            height={ARENA.height}
            aria-label="Kambal Pitai game canvas"
          />
          {isOnline && (
            <div className="match-status">
              <strong>
                {playMode === "online" && localFighter
                  ? `You are ${localFighter.name}`
                  : "Online match"}
              </strong>
              <span>{onlineMessage}</span>
              {roomId && <small>Room {roomId.slice(0, 8)}</small>}
            </div>
          )}
          <div className="hud">
            {fighters.map((fighter) => (
              <div className="hud-card" key={fighter.key}>
                <div className="hud-row">
                  <strong>{fighter.name}</strong>
                  <span>{fighter.hp} HP</span>
                </div>
                <div className="health-bar">
                  <div
                    className="health-fill"
                    style={{
                      width: `${fighter.hp}%`,
                      background: fighter.outfit,
                    }}
                  />
                </div>
                <div className="hud-row small">
                  <span>Score {fighter.score}</span>
                  <span>
                    {fighter.entrappedTimer > 0
                      ? "Entrapped"
                      : fighter.downedTimer > 0
                        ? "Grounded"
                        : level.weapon}
                  </span>
                </div>
                <div className="guard-meter">
                  <div
                    className="guard-fill"
                    style={{ width: `${fighter.guardMeter}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
          {(showStartOverlay || showWaitingOverlay) && (
            <div className="overlay">
              <div className="overlay-card">
                <p className="eyebrow">Online Matchmaking</p>
                <h2>{showWaitingOverlay ? "Finding opponent" : "Start game"}</h2>
                <p>
                  Start an online match to be paired with another player. Each player
                  uses the same keyboard controls on their own device, or the mobile
                  buttons below the arena.
                </p>
                {onlineMessage && <p className="status-copy">{onlineMessage}</p>}
                <div className="overlay-actions">
                  {showWaitingOverlay ? (
                    <button onClick={cancelOnlineSearch}>Cancel</button>
                  ) : (
                    <>
                      <button className="accent" onClick={startOnlineGame}>
                        Start online game
                      </button>
                      <button onClick={startOfflineGame}>Local practice</button>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}
          {winner && (
            <div className="overlay">
              <div className="overlay-card">
                <p className="eyebrow">Round {round} Complete</p>
                <h2>
                  {winner === "draw"
                    ? "Draw"
                    : `${fighters.find((fighter) => fighter.key === winner)?.name} wins`}
                </h2>
                <p>{level.description}</p>
                <div className="overlay-actions">
                  <button onClick={() => resetRound()}>Replay level</button>
                  <button className="accent" onClick={advanceLevel}>
                    Next level
                  </button>
                </div>
              </div>
            </div>
          )}
          <div className="mobile-controls" aria-label="Mobile controls">
            {MOBILE_CONTROLS.map((control) => (
              <button
                key={control.action}
                type="button"
                onPointerDown={(event) => {
                  event.preventDefault();
                  updateLocalInput(control.action, true);
                }}
                onPointerUp={(event) => {
                  event.preventDefault();
                  updateLocalInput(control.action, false);
                }}
                onPointerCancel={() => updateLocalInput(control.action, false)}
                onPointerLeave={() => updateLocalInput(control.action, false)}
              >
                {control.label}
              </button>
            ))}
          </div>
        </div>

        <aside className="side-panel">
          <div className="panel-card">
            <p className="eyebrow">Controls</p>
            <h3>Online or local</h3>
            <p>
              <strong>Keyboard:</strong> `A/D` or arrow keys move, `W` or up jumps,
              `F` or `J` swings, `G` or `K` throws, `S` or down guards.
            </p>
            <p>
              In online matches both players use these same controls on their own
              device. The matchmaker assigns the fighter.
            </p>
          </div>

          <div className="panel-card">
            <p className="eyebrow">Weapons</p>
            <h3>Protection and attack</h3>
            <p>{level.description}</p>
            <p>
              Guarding reduces incoming damage, but overusing it can break defense and
              leave the fighter open.
            </p>
            <p>
              In the bedsheet level, a clean bedsheet hit can wrap the opponent and
              slam them to the ground for a short recovery window.
            </p>
          </div>

          <div className="panel-card">
            <p className="eyebrow">Room Look</p>
            <h3>More realistic bedroom</h3>
            <p>
              The arena now has a framed window, wardrobe, side table, layered bed,
              wooden floor, and rug to feel more like a lived-in room.
            </p>
          </div>
        </aside>
      </section>
    </div>
  );
}
