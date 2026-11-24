"use strict";
const c = document.getElementById("game"),
  ctx = c.getContext("2d"),
  W = 1600,
  H = 1100;
// Camera viewport defaults to the full canvas. These values must exist before
// the first animation frame; otherwise draw() throws and the battlefield stays blank.
const VIEW_W = W,
  VIEW_H = H;
let camX = 0,
  camY = 0;
let paused = true,
  started = false,
  menuOpen = true,
  encounterUI = false;
ctx.imageSmoothingEnabled = false;
const CROSS = 2 * Math.PI;
const P = { x: W / 2, y: H / 2, hp: 150, max: 150, sp: 3.5, r: 18 };
let souls = 100,
  wave = 1,
  keys = {},
  B = [],
  EB = [],
  E = [],
  M = [],
  Pt = [],
  Sl = [],
  Bm = [],
  Fx = [],
  boss = null,
  lastBossKey = null;
const D2 = (a, b) => {
  const dx = a.x - b.x,
    dy = a.y - b.y;
  return dx * dx + dy * dy;
};
const D = (a, b) => Math.sqrt(D2(a, b));
const R = Math.random;
const nearest = (o) => {
  let b = null,
    bd = 1e12;
  for (const e of E) {
    if (e.hp <= 0) continue;
    const d = D2(e, o);
    if (d < bd) {
      bd = d;
      b = e;
    }
  }
  return b;
};
function distToBeam(px, py, b) {
  const dx = Math.cos(b.angle),
    dy = Math.sin(b.angle),
    t = Math.max(0, Math.min(470, (px - b.x) * dx + (py - b.y) * dy));
  return Math.hypot(px - (b.x + dx * t), py - (b.y + dy * t));
}
const cl = (o) => {
  o.x = o.x < o.r ? o.r : o.x > W - o.r ? W - o.r : o.x;
  o.y = o.y < o.r ? o.r : o.y > H - o.r ? H - o.r : o.y;
};
const toggleFS = () =>
  document.fullscreenElement
    ? document.exitFullscreen()
    : document.documentElement.requestFullscreen();
function updateCamera() {
  camX = Math.max(0, Math.min(W - VIEW_W, P.x - VIEW_W / 2));
  camY = Math.max(0, Math.min(H - VIEW_H, P.y - VIEW_H / 2));
}
function spawnEdgePoint(minPlayer = 360) {
  for (let tries = 0; tries < 80; tries++) {
    const side = (R() * 4) | 0,
      p =
        side === 0
          ? { x: 45 + R() * (W - 90), y: 45 }
          : side === 1
            ? { x: 45 + R() * (W - 90), y: H - 45 }
            : side === 2
              ? { x: 45, y: 45 + R() * (H - 90) }
              : { x: W - 45, y: 45 + R() * (H - 90) };
    if (D2(p, P) > minPlayer * minPlayer) return p;
  }
  return { x: R() * W, y: R() * H };
}
function setMenuState(isPaused) {
  paused = !!isPaused;
  menuOpen = paused;
  const overlay = document.getElementById("menuOverlay");
  const startBtn = document.getElementById("startBtn");
  const pauseBtn = document.getElementById("pauseBtn");
  if (overlay) overlay.style.display = menuOpen ? "flex" : "none";
  if (startBtn)
    startBtn.textContent = started ? "▶ RESUME BATTLE" : "▶ START GAME";
  if (pauseBtn) pauseBtn.textContent = paused ? "▶ RESUME" : "Ⅱ PAUSE";
  if (paused) keys = {};
}
function startGame() {
  started = true;
  setMenuState(false);
}
function pauseGame() {
  setMenuState(!paused);
}
function showMainMenu() {
  setMenuState(true);
}
function resumeGame() {
  started = true;
  setMenuState(false);
}
function restartGame() {
  location.reload();
}

// ============ PIXEL BATTLEFIELD BG ============
const bgCanvas = document.createElement("canvas");
bgCanvas.width = W;
bgCanvas.height = H;
const bgCtx = bgCanvas.getContext("2d");
bgCtx.imageSmoothingEnabled = false;
(function () {
  const PX = 8;
  for (let y = 0; y < H; y += PX)
    for (let x = 0; x < W; x += PX) {
      const n = R();
      bgCtx.fillStyle =
        n < 0.3
          ? "#3a4a2a"
          : n < 0.55
            ? "#4a5a32"
            : n < 0.72
              ? "#5a4a2e"
              : n < 0.85
                ? "#6b5535"
                : n < 0.93
                  ? "#4d3d24"
                  : "#2e3a20";
      bgCtx.fillRect(x, y, PX, PX);
    }
  for (let i = 0; i < 180; i++) {
    const x = (((R() * W) / PX) | 0) * PX,
      y = (((R() * H) / PX) | 0) * PX;
    bgCtx.fillStyle = R() < 0.5 ? "#2e3a20" : "#5a6e3a";
    bgCtx.fillRect(x, y, PX, PX);
    bgCtx.fillRect(x + PX, y - PX, PX, PX);
    bgCtx.fillRect(x - PX, y + PX, PX, PX);
  }
  for (let i = 0; i < 60; i++) {
    const x = (((R() * W) / PX) | 0) * PX,
      y = (((R() * H) / PX) | 0) * PX;
    bgCtx.fillStyle = "#5a5a5a";
    bgCtx.fillRect(x, y, PX * 1.5, PX);
    bgCtx.fillStyle = "#7a7a7a";
    bgCtx.fillRect(x, y, PX, PX * 0.5);
    bgCtx.fillStyle = "#3a3a3a";
    bgCtx.fillRect(x + PX, y + PX, PX, PX * 0.5);
  }
  for (let i = 0; i < 40; i++) {
    const x = (((R() * W) / PX) | 0) * PX,
      y = (((R() * H) / PX) | 0) * PX;
    bgCtx.fillStyle = R() < 0.5 ? "#6b1a1a" : "#4a0f0f";
    bgCtx.fillRect(x, y, PX, PX);
    bgCtx.fillRect(x + PX, y + PX, PX, PX);
  }
  const wall = (x, y, w, h) => {
    for (let by = 0; by < h; by += PX)
      for (let bx = 0; bx < w; bx += PX) {
        const off = (((by / PX) % 2) * PX) / 2,
          n = R();
        bgCtx.fillStyle = n < 0.4 ? "#6a6a6a" : n < 0.7 ? "#5a5a5a" : "#7a7a7a";
        bgCtx.fillRect(x + bx + off, y + by, PX - 1, PX - 1);
      }
    bgCtx.strokeStyle = "#2a2a2a";
    bgCtx.lineWidth = 2;
    bgCtx.strokeRect(x, y, w, h);
  };
  wall(80, 120, 140, 60);
  wall(900, 500, 120, 80);
  wall(500, 650, 180, 50);
  wall(200, 400, 80, 120);
  wall(1000, 180, 80, 100);
  const crate = (x, y, s) => {
    bgCtx.fillStyle = "#8b6914";
    bgCtx.fillRect(x, y, s, s);
    bgCtx.fillStyle = "#6b4d0e";
    bgCtx.fillRect(x, y, s, PX);
    bgCtx.fillRect(x, y + s - PX, s, PX);
    bgCtx.fillRect(x, y, PX, s);
    bgCtx.fillRect(x + s - PX, y, PX, s);
  };
  crate(340, 220, 32);
  crate(720, 560, 40);
  crate(560, 340, 24);
  crate(150, 650, 32);
  const tree = (x, y, h) => {
    bgCtx.fillStyle = "#3a2a1a";
    for (let i = 0; i < h; i += PX) bgCtx.fillRect(x, y - i, PX, PX);
    bgCtx.fillRect(x - PX, y - h * 0.5, PX, PX);
    bgCtx.fillRect(x + PX, y - h * 0.7, PX, PX);
    bgCtx.fillRect(x, y - h, PX * 2, PX);
  };
  tree(50, 300, 40);
  tree(1150, 400, 48);
  tree(600, 60, 32);
  tree(1000, 700, 40);
  const fire = (x, y) => {
    bgCtx.fillStyle = "#4a3a2a";
    bgCtx.fillRect(x - PX * 1.5, y - PX, PX * 3, PX);
    bgCtx.fillStyle = "#ff6b1a";
    bgCtx.fillRect(x - PX * 0.5, y - PX * 2.5, PX, PX * 1.5);
  };
  fire(280, 580);
  fire(850, 240);
  fire(420, 120);
  const vg = bgCtx.createRadialGradient(
    W / 2,
    H / 2,
    H * 0.4,
    W / 2,
    H / 2,
    H * 0.85,
  );
  vg.addColorStop(0, "rgba(0,0,0,0)");
  vg.addColorStop(1, "rgba(0,0,0,0.55)");
  bgCtx.fillStyle = vg;
  bgCtx.fillRect(0, 0, W, H);
})();

// ============ CACHED GRADIENTS ============
const chibakuGrad = ctx.createRadialGradient(0, 0, 10, 0, 0, 260);
chibakuGrad.addColorStop(0, "rgba(0,0,0,.5)");
chibakuGrad.addColorStop(0.5, "rgba(30,10,50,.25)");
chibakuGrad.addColorStop(1, "rgba(0,0,0,0)");

// ============ SFX ============
let actx = null,
  sndOn = true,
  lastHit = 0,
  lastAoe = 0,
  lastWave = 0,
  lastMagic = 0;
function ensureAudio() {
  if (!sndOn) return null;
  if (!actx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (AC) actx = new AC();
  }
  if (actx && actx.state === "suspended") actx.resume().catch(() => {});
  return actx;
}
function toggleSound() {
  sndOn = !sndOn;
  document.getElementById("sndBtn").textContent = sndOn ? "🔊 SFX" : "🔇 MUTE";
  if (sndOn) {
    ensureAudio();
    tone(520, "sine", 0.08, 0.08);
  }
}
function tone(freq, type = "sine", dur = 0.12, vol = 0.08, slide = null) {
  const a = ensureAudio();
  if (!a) return;
  const now = a.currentTime,
    o = a.createOscillator(),
    g = a.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, now);
  if (slide)
    o.frequency.exponentialRampToValueAtTime(Math.max(30, slide), now + dur);
  g.gain.setValueAtTime(vol, now);
  g.gain.exponentialRampToValueAtTime(0.001, now + dur);
  o.connect(g);
  g.connect(a.destination);
  o.start(now);
  o.stop(now + dur);
}
function noise(dur = 0.15, vol = 0.09, hp = 400) {
  const a = ensureAudio();
  if (!a) return;
  const len = (a.sampleRate * dur) | 0,
    buf = a.createBuffer(1, len, a.sampleRate),
    d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (R() * 2 - 1) * (1 - i / len);
  const s = a.createBufferSource();
  s.buffer = buf;
  const f = a.createBiquadFilter();
  f.type = "highpass";
  f.frequency.value = hp;
  const g = a.createGain();
  g.gain.setValueAtTime(vol, a.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001, a.currentTime + dur);
  s.connect(f);
  f.connect(g);
  g.connect(a.destination);
  s.start();
}
const sfx = {
  shoot: () => tone(620, "triangle", 0.07, 0.06, 240),
  magic: () => {
    const t = performance.now();
    if (t - lastMagic < 55) return;
    lastMagic = t;
    tone(760, "sine", 0.11, 0.06, 340);
  },
  aoe: () => {
    const t = performance.now();
    if (t - lastAoe < 70) return;
    lastAoe = t;
    noise(0.18, 0.1, 200);
    tone(175, "sawtooth", 0.16, 0.08, 58);
  },
  wave: () => {
    const t = performance.now();
    if (t - lastWave < 85) return;
    lastWave = t;
    tone(260, "sawtooth", 0.22, 0.08, 95);
    noise(0.16, 0.07, 500);
  },
  hit: () => {
    const t = performance.now();
    if (t - lastHit < 45) return;
    lastHit = t;
    tone(210, "sawtooth", 0.06, 0.04, 95);
  },
  slash: () => {
    noise(0.09, 0.07, 700);
    tone(340, "sawtooth", 0.08, 0.05, 130);
  },
  boom: () => {
    noise(0.22, 0.12, 140);
    tone(130, "sawtooth", 0.2, 0.09, 42);
  },
  summon: () => tone(320, "triangle", 0.16, 0.08, 680),
  heal: () => tone(540, "sine", 0.12, 0.05, 810),
  absorb: () => tone(240, "sine", 0.14, 0.055, 620),
  gedo: () => {
    tone(180, "sawtooth", 0.35, 0.11, 75);
    noise(0.28, 0.1, 220);
  },
  gedoRev: () => {
    tone(280, "triangle", 0.18, 0.1, 560);
    setTimeout(() => tone(560, "triangle", 0.25, 0.1, 880), 120);
  },
  mini: () => {
    tone(150, "sawtooth", 0.25, 0.1, 85);
    setTimeout(() => tone(190, "square", 0.22, 0.09, 110), 130);
  },
  roar: () => {
    noise(0.3, 0.14, 90);
    tone(110, "sawtooth", 0.35, 0.12, 48);
  },
  clear: () => {
    tone(440, "triangle", 0.12, 0.08, 554);
    setTimeout(() => tone(659, "triangle", 0.18, 0.09, 880), 110);
  },
  revive: () => {
    tone(300, "triangle", 0.15, 0.08, 600);
    setTimeout(() => tone(600, "sine", 0.2, 0.07, 900), 100);
  },
  lunar: () => {
    tone(880, "sine", 0.14, 0.06, 1320);
    tone(660, "triangle", 0.12, 0.05, 990);
  },
  holy: () => {
    tone(660, "sine", 0.18, 0.1, 990);
    setTimeout(() => tone(990, "triangle", 0.28, 0.12, 1480), 140);
  },
  beast: () => {
    noise(0.25, 0.13, 120);
    tone(140, "sawtooth", 0.3, 0.11, 60);
  },
  dark: () => {
    tone(200, "sawtooth", 0.3, 0.12, 80);
    setTimeout(() => tone(400, "square", 0.25, 0.1, 160), 120);
  },
  abyss: () => {
    noise(0.35, 0.15, 80);
    tone(90, "sawtooth", 0.4, 0.13, 40);
  },
  dragonRoar: () => {
    noise(0.4, 0.16, 70);
    tone(85, "sawtooth", 0.45, 0.14, 38);
  },
  abyssLaser: () => {
    tone(180, "sawtooth", 0.5, 0.12, 60);
    noise(0.4, 0.1, 150);
    setTimeout(() => tone(320, "square", 0.3, 0.1, 110), 80);
  },
  deva: () => {
    tone(95, "sine", 0.42, 0.13, 38);
    noise(0.28, 0.1, 100);
    tone(260, "triangle", 0.22, 0.055, 90);
  },
  gedoTrail: () => {
    const t = performance.now();
    if (t - lastMagic < 115) return;
    lastMagic = t;
    tone(520, "sine", 0.09, 0.035, 190);
  },
  cinderSlash: () => {
    noise(0.12, 0.075, 900);
    tone(460, "sawtooth", 0.13, 0.075, 125);
  },
  cinderLightning: () => {
    noise(0.2, 0.12, 1200);
    tone(980, "square", 0.16, 0.085, 180);
    tone(220, "sawtooth", 0.2, 0.06, 70);
  },
  cinderRain: () => {
    tone(700, "triangle", 0.22, 0.06, 250);
    noise(0.2, 0.06, 650);
  },
  // New custom Cinder sounds
  cinderThrust: () => {
    noise(0.08, 0.09, 600);
    tone(380, "sawtooth", 0.1, 0.09, 90);
    setTimeout(() => tone(520, "triangle", 0.12, 0.07, 180), 40);
  },
  cinderImpact: () => {
    noise(0.18, 0.12, 150);
    tone(140, "sawtooth", 0.2, 0.1, 50);
    tone(90, "square", 0.15, 0.06, 40);
  },
  cinderSpin: () => {
    noise(0.1, 0.07, 800);
    tone(620, "sawtooth", 0.08, 0.06, 200);
    tone(440, "triangle", 0.1, 0.05, 300);
  },
  cinderCharge: () => {
    tone(180, "sawtooth", 0.25, 0.09, 60);
    noise(0.15, 0.08, 300);
    setTimeout(() => tone(320, "sawtooth", 0.12, 0.07, 120), 80);
  },
  cinderBeam: () => {
    tone(700, "sine", 0.3, 0.08, 200);
    noise(0.2, 0.06, 900);
    tone(1100, "triangle", 0.15, 0.05, 400);
  },
  cinderAwaken: () => {
    noise(0.3, 0.14, 100);
    tone(120, "sawtooth", 0.4, 0.12, 40);
    setTimeout(() => {
      tone(400, "square", 0.2, 0.08, 150);
      tone(800, "triangle", 0.25, 0.07, 300);
    }, 100);
  },
  cinderDive: () => {
    noise(0.15, 0.1, 200);
    tone(90, "sawtooth", 0.3, 0.11, 35);
    setTimeout(() => tone(200, "sawtooth", 0.15, 0.08, 70), 60);
  },
  cinderLand: () => {
    noise(0.25, 0.14, 80);
    tone(70, "sawtooth", 0.3, 0.12, 30);
    tone(150, "square", 0.18, 0.08, 50);
  },
};

for (const k of Object.keys(sfx)) {
  const f = sfx[k];
  let lt = 0;
  sfx[k] = (...a) => {
    const n = performance.now();
    if (n - lt < 45) return;
    lt = n;
    return f(...a);
  };
}
// ============ HELPERS ============
const dHeal = () => Math.min(100, 20 + ((wave / 10) | 0) * 10);
const dConv = () => Math.min(100, 10 + ((wave / 10) | 0) * 10) / 100;
const burst = (x, y, n, col, spd = 6, life = 20) => {
  for (let i = 0; i < n; i++)
    Pt.push({
      x,
      y,
      vx: (R() - 0.5) * spd * 2,
      vy: (R() - 0.5) * spd * 2,
      life,
      c: col,
    });
};
const addFx = (
  x,
  y,
  color,
  radius = 150,
  life = 30,
  kind = "burst",
  extra = {},
) => {
  Fx.push({ x, y, color, radius, life, maxLife: life, kind, ...extra });
  if (Fx.length > 90) Fx.splice(0, Fx.length - 90);
};
const ring = (x, y, n, col, rad = 120, spd = 5) => {
  for (let i = 0; i < n; i++) {
    const a = (i / n) * CROSS;
    Pt.push({
      x: x + Math.cos(a) * rad,
      y: y + Math.sin(a) * rad,
      vx: Math.cos(a) * spd,
      vy: Math.sin(a) * spd,
      life: 32,
      c: col,
    });
  }
  addFx(x, y, col, rad, 30, "shock");
  addFx(x, y, "#ffffff", rad * 0.72, 18, "flash");
  sfx.aoe();
};
const slash = (x, y, a, col = "#fde047", life = 16) => {
  Sl.push({ x, y, angle: a, life, c: col, maxLife: life });
  addFx(x, y, col, 150, Math.max(13, life), "slash", { angle: a });
  sfx.slash();
};

// High-contrast melee language for non-Cinder heroes: directional telegraph + weapon trail.
const heroMelee = (
  x,
  y,
  a,
  col = "#fde047",
  reach = 155,
  span = 1.05,
  life = 20,
) => {
  addFx(x, y, col, reach, life, "meleeTell", { angle: a, span });
  addFx(x, y, "#ffffff", reach * 0.58, Math.max(8, life - 5), "ring");
  Sl.push({
    x,
    y,
    angle: a,
    life,
    c: col,
    maxLife: life,
    wide: true,
    rad: reach,
  });
  Sl.push({
    x,
    y,
    angle: a + span * 0.22,
    life: Math.max(9, life - 4),
    c: "#ffffff",
    maxLife: Math.max(9, life - 4),
    wide: true,
    rad: reach * 0.78,
  });
  sfx.slash();
};
const heroMeleeBurst = (x, y, col = "#7e22ce", reach = 190, life = 20) => {
  addFx(x, y, col, reach, life, "meleeBurst");
  addFx(x, y, "#ffffff", reach * 0.52, Math.max(8, life - 7), "ring");
  burst(x, y, 18, col, 9, 24);
};

// Strong visible sword sweep for Cinder (wide arc + range indicator)
const cinderSweep = (x, y, angle, col = "#f97316", rad = 180, life = 22) => {
  // main wide slash arc
  Sl.push({
    x,
    y,
    angle: angle,
    life: life,
    c: col,
    maxLife: life,
    wide: true,
    rad: rad,
  });
  Sl.push({
    x,
    y,
    angle: angle + 0.35,
    life: life - 3,
    c: "#fde047",
    maxLife: life - 3,
    wide: true,
    rad: rad * 0.9,
  });
  // secondary reverse trail
  Sl.push({
    x,
    y,
    angle: angle - 0.45,
    life: Math.max(10, life - 6),
    c: "#fb923c",
    maxLife: life - 6,
    wide: true,
    rad: rad * 0.75,
  });
  // range indicator ring so player sees hit zone
  addFx(x, y, col, rad, 16, "ring");
  addFx(x, y, "#ffffff", rad * 0.55, 10, "flash");
  // particles along the arc
  for (let i = 0; i < 12; i++) {
    const q = angle - 0.9 + i * 0.16;
    Pt.push({
      x: x + Math.cos(q) * rad * 0.7,
      y: y + Math.sin(q) * rad * 0.7,
      vx: Math.cos(q) * 4,
      vy: Math.sin(q) * 4,
      life: 18,
      c: i % 2 ? col : "#fde047",
    });
  }
  sfx.cinderSlash();
};

const dmgE = (e, d, kn = 0, src = null) => {
  if (!e) return;
  if (
    boss &&
    boss.hp > 0 &&
    D2(e, boss) < boss.buff2 &&
    !e.isBoss &&
    (boss.t === "paladin" || boss.t === "bishop")
  )
    d *= 0.5;
  e.hp -= d;
  sfx.hit();
  if (kn && src) {
    const a = Math.atan2(e.y - src.y, e.x - src.x);
    e.x += Math.cos(a) * kn;
    e.y += Math.sin(a) * kn;
    cl(e);
  }
};
const hitAll = (m, rad, dmg, kn = 20) => {
  sfx.aoe();
  const r2 = rad * rad;
  let h = 0;
  for (const e of E) {
    if (D2(e, m) < r2) {
      dmgE(e, dmg, kn, m);
      h++;
    }
  }
  return h;
};
const skyBoom = (x, y, d) => {
  addFx(x, y, "#fef08a", 60, 10, "flash");
  for (let i = 0; i < 3; i++)
    Pt.push({
      x,
      y,
      vx: (R() - 0.5) * 6,
      vy: (R() - 0.5) * 6,
      life: 12,
      c: "#fde047",
    });
  const r2 = 6400;
  for (const e of E)
    if ((e.x - x) ** 2 + (e.y - y) ** 2 < r2) dmgE(e, d, 8, null);
};
const lightningBoom = (x, y, rad, dmg, col) => {
  sfx.boom();
  addFx(x, y, col, rad, 30, "nova");
  addFx(x, y, "#ffffff", rad * 0.6, 12, "flash");
  burst(x, y, 14, col, 9, 24);
  const r2 = rad * rad;
  for (const e of E)
    if ((e.x - x) ** 2 + (e.y - y) ** 2 < r2) dmgE(e, dmg, 20, null);
};
const moveTo = (m, t, s) => {
  const a = Math.atan2(t.y - m.y, t.x - m.x);
  m.x += Math.cos(a) * s;
  m.y += Math.sin(a) * s;
  cl(m);
  return a;
};
const beam = (x, y, a, w, dmg, tag) => {
  Bm.push({
    x,
    y,
    angle: a,
    life: 32,
    maxLife: 32,
    width: w,
    dmg,
    [tag]: true,
  });
  addFx(
    x,
    y,
    tag === "cinder" ? "#60a5fa" : tag === "midir" ? "#a78bfa" : "#fde047",
    w * 1.8,
    30,
    "beam",
    { angle: a },
  );
  sfx.wave();
};

// ============ NAGATO HELPERS ============
function healNagato(nag, amt) {
  if (!nag || nag.hp <= 0 || amt <= 0) return;
  nag.hp = Math.min(nag.max, nag.hp + amt);
  P.hp = Math.min(P.max, P.hp + amt);
  if (R() < 0.35) {
    sfx.heal();
    Pt.push({ x: nag.x, y: nag.y - 22, vx: 0, vy: -1, life: 16, c: "#4ade80" });
    Pt.push({ x: P.x, y: P.y - 22, vx: 0, vy: -1, life: 16, c: "#4ade80" });
  }
}
function pretraHealNaraka(nag) {
  const naraka = M.find(
    (m) => m.type === "pain" && m.painType === "NARAKA" && m.hp > 0,
  );
  if (naraka) {
    naraka.hp = Math.min(naraka.max, naraka.hp + naraka.max * 0.06);
    sfx.heal();
    burst(naraka.x, naraka.y, 8, "#f8fafc", 5, 18);
  }
  if (nag && nag.hp > 0) {
    sfx.absorb();
    healNagato(nag, nag.max * 0.02);
  }
}
function absorbHealNagato(nag) {
  if (!nag || nag.hp <= 0) return;
  sfx.absorb();
  healNagato(nag, nag.max * 0.02);
}
const getGedoReq = (nag) => 10 + (nag.gedoDeaths || 0) * 5;
function triggerGedoRevive(nag) {
  if (!nag || nag.gedoActive) return;
  nag.gedoDeaths = (nag.gedoDeaths || 0) + 1;
  const req = getGedoReq(nag);
  nag.gedoReq = req;
  nag.gedoActive = true;
  nag.gedoKills = 0;
  nag.gedoT = 235;
  nag.hp = 1;
  sfx.gedo();
  addFx(nag.x, nag.y, "#a855f7", 330, 70, "nova");
  addFx(nag.x, nag.y, "#e9d5ff", 250, 50, "aura");
  addFx(nag.x, nag.y, "#ffffff", 180, 22, "flash");
  burst(nag.x, nag.y, 65, "#a855f7", 14, 48);
  ring(nag.x, nag.y, 30, "#c084fc", 180, 6);
  B.push({
    x: nag.x,
    y: nag.y,
    vx: 9.5,
    vy: 0,
    dmg: 9999,
    color: "#a855f7",
    r: 26,
    gedo: true,
    life: 235,
    owner: nag,
    zig: 0,
    trailCd: 0,
  });
}
function resolveGedoOutcome(nag) {
  if (!nag || !nag.gedoActive) return;
  const req = nag.gedoReq || getGedoReq(nag);
  nag.gedoActive = false;
  nag.gedoT = 0;
  for (const b of B) if (b.gedo && b.owner === nag) b.dead = true;
  if ((nag.gedoKills || 0) >= req) {
    nag.hp = nag.max;
    nag.animalDone = false;
    nag.painDone = false;
    nag.canResummon = true;
    sfx.gedoRev();
    burst(nag.x, nag.y, 45, "#ef4444", 12, 40);
    ring(nag.x, nag.y, 24, "#f87171", 200, 6);
    summonBeasts(nag);
    summonPains(nag);
  } else {
    nag.hp = 0;
    sfx.boom();
    burst(nag.x, nag.y, 35, "#7e22ce", 10, 35);
  }
}
function damageSummon(m, amt) {
  if (!m || m.hp <= 0) return;
  if (m.type === "nagato") {
    if (m.gedoActive) {
      m.hp = Math.max(1, m.hp);
      return;
    }
    const next = m.hp - amt;
    if (next <= 30) {
      triggerGedoRevive(m);
      return;
    }
    m.hp = next;
    return;
  }
  m.hp -= amt;
}
function summonBeasts(nag) {
  if (nag.animalDone) return;
  nag.animalDone = true;
  if (M.filter((o) => o.type === "beast" && o.hp > 0).length >= 5) return;
  const B2 = [
    ["🐶", "DOG", 1100, 30, 75, "#f97316", 2.9],
    ["🦎", "CHAMELEON", 900, 26, 65, "#4ade80", 2.8],
    ["🦏", "RHINO", 1450, 34, 95, "#94a3b8", 2.6],
    ["🐦", "BIRD", 850, 24, 60, "#60a5fa", 3.1],
    ["🐼", "PANDA", 1300, 32, 85, "#e8e8ff", 2.5],
  ];
  B2.forEach((b, i) => {
    const a = (i / 5) * CROSS;
    M.push({
      type: "beast",
      x: nag.x + Math.cos(a) * 85,
      y: nag.y + Math.sin(a) * 85,
      hp: b[2],
      max: b[2],
      sp: b[6],
      r: b[3],
      dmg: b[4],
      emoji: b[0],
      color: b[5],
      beastName: b[1],
      parent: nag,
      cd: 70 + i * 15,
    });
  });
  burst(nag.x, nag.y, 25, "#eab308", 10, 30);
}
function summonPains(nag, count = 6, reinforce = false) {
  const active = M.filter((o) => o.type === "pain" && o.hp > 0);
  if (active.length >= 6) return;
  if (!reinforce && nag.painDone) return;
  if (!reinforce) nag.painDone = true;
  const all = [
    ["DEVA", "#ef4444", 950, 80, 2.8, "👁️"],
    ["ASURA", "#f97316", 900, 75, 2.9, "🤖"],
    ["HUMAN", "#a855f7", 850, 80, 3.1, "🧠"],
    ["ANIMAL", "#eab308", 900, 70, 2.8, "🦁"],
    ["PRETA", "#38bdf8", 1000, 65, 2.7, "🛡️"],
    ["NARAKA", "#f8fafc", 900, 70, 2.6, "👑"],
  ];
  const allowed = Math.min(count, 6 - active.length);
  const list = reinforce ? all.slice(0, allowed) : all;
  list.forEach((p, i) => {
    const a = (i / list.length) * CROSS;
    M.push({
      type: "pain",
      painType: p[0],
      x: nag.x + Math.cos(a) * 75,
      y: nag.y + Math.sin(a) * 75,
      hp: p[2],
      max: p[2],
      sp: p[4],
      r: 22,
      dmg: p[3],
      emoji: p[5],
      color: p[1],
      parent: nag,
      cd: 45 + i * 12,
      subCd: 90,
    });
  });
  burst(nag.x, nag.y, 30, reinforce ? "#f8fafc" : "#ef4444", 10, 30);
}

// ============ NARAKA REVIVE ============
let deadPainBodies = [];
function recordPainDeath(p) {
  if (!p || p.type !== "pain" || p.painType === "NARAKA") return;
  deadPainBodies.push({
    x: p.x,
    y: p.y,
    painType: p.painType,
    emoji: p.emoji,
    color: p.color,
    max: p.max,
    dmg: p.dmg,
    sp: p.sp,
    r: p.r,
    parent: p.parent,
    age: 0,
  });
  if (deadPainBodies.length > 12) deadPainBodies.shift();
}
function narakaInstantRevive() {
  const naraka = M.find(
    (m) => m.type === "pain" && m.painType === "NARAKA" && m.hp > 0,
  );
  if (!naraka || !deadPainBodies.length) return;
  if (M.filter((m) => m.type === "pain" && m.hp > 0).length >= 6) return;
  const body = deadPainBodies.shift();
  if (!body) return;
  M.push({
    type: "pain",
    painType: body.painType,
    x: naraka.x + (R() - 0.5) * 50,
    y: naraka.y + (R() - 0.5) * 50,
    hp: body.max,
    max: body.max,
    sp: body.sp,
    r: body.r,
    dmg: body.dmg,
    emoji: body.emoji,
    color: body.color,
    parent: body.parent,
    cd: 60,
    subCd: 90,
    revived: true,
  });
  sfx.revive();
  burst(naraka.x, naraka.y, 25, "#f8fafc", 10, 30);
  ring(naraka.x, naraka.y, 18, "#fde047", 110, 5);
  slash(naraka.x, naraka.y, 0, "#fde047", 20);
}

// ============ ENEMIES ============
function makeEnemy(x, y, n, variant) {
  const ts = 1 + Math.max(0, n - 1) * 0.045,
    bh = (52 + n * 10.5) * ts,
    bs = Math.min(3.6, 1.25 + n * 0.075);
  if (variant === "speedster")
    return {
      x,
      y,
      hp: bh * 0.7,
      max: bh * 0.7,
      sp: bs * 2.65,
      r: 13,
      slowT: 0,
      variant,
      emoji: "💨",
      color: "#38bdf8",
      shootCd: 0,
      dmgMult: 1.25,
    };
  if (variant === "tank")
    return {
      x,
      y,
      hp: bh * 3.8,
      max: bh * 3.8,
      sp: bs * 0.62,
      r: 29,
      slowT: 0,
      variant,
      emoji: "🛡️",
      color: "#94a3b8",
      shootCd: 0,
      dmgMult: 1.4,
    };
  if (variant === "shooter")
    return {
      x,
      y,
      hp: bh * 0.9,
      max: bh * 0.9,
      sp: bs * 0.78,
      r: 16,
      slowT: 0,
      variant,
      emoji: "🏹",
      color: "#a3e635",
      shootCd: 55 + R() * 50,
      dmgMult: 1.25,
    };
  if (variant === "splitter")
    return {
      x,
      y,
      hp: bh * 1.35,
      max: bh * 1.35,
      sp: bs * 0.95,
      r: 20,
      slowT: 0,
      variant,
      emoji: "💥",
      color: "#f97316",
      shootCd: 0,
      dmgMult: 1.2,
    };
  if (variant === "healer")
    return {
      x,
      y,
      hp: bh * 0.85,
      max: bh * 0.85,
      sp: bs * 0.85,
      r: 16,
      slowT: 0,
      variant,
      emoji: "💚",
      color: "#4ade80",
      shootCd: 0,
      healCd: 55,
      dmgMult: 1.1,
    };
  if (variant === "berserker")
    return {
      x,
      y,
      hp: bh * 1.2,
      max: bh * 1.2,
      sp: bs * 2.15,
      r: 17,
      slowT: 0,
      variant,
      emoji: "😡",
      color: "#fb7185",
      shootCd: 0,
      dmgMult: 1.85,
    };
  if (variant === "bomber")
    return {
      x,
      y,
      hp: bh * 0.85,
      max: bh * 0.85,
      sp: bs * 1.85,
      r: 16,
      slowT: 0,
      variant,
      emoji: "💣",
      color: "#f43f5e",
      shootCd: 0,
      dmgMult: 2.2,
    };
  if (variant === "sniper")
    return {
      x,
      y,
      hp: bh * 0.8,
      max: bh * 0.8,
      sp: bs * 0.65,
      r: 16,
      slowT: 0,
      variant,
      emoji: "🎯",
      color: "#c084fc",
      shootCd: 110 + R() * 60,
      dmgMult: 1.9,
    };
  if (variant === "necro")
    return {
      x,
      y,
      hp: bh * 1.4,
      max: bh * 1.4,
      sp: bs * 0.75,
      r: 18,
      slowT: 0,
      variant,
      emoji: "☠️",
      color: "#a855f7",
      shootCd: 0,
      summonCd: 180,
      dmgMult: 1.2,
    };
  return {
    x,
    y,
    hp: bh * 1.15,
    max: bh * 1.15,
    sp: bs * 1.1,
    r: 16,
    slowT: 0,
    variant: "normal",
    emoji: "👹",
    color: "#e63946",
    shootCd: 0,
    dmgMult: 1.2,
  };
}
function pickVariant(n) {
  const r = R();
  if (n < 3) return r < 0.75 ? "normal" : "berserker";
  if (n < 5)
    return r < 0.5
      ? "normal"
      : r < 0.7
        ? "berserker"
        : r < 0.85
          ? "speedster"
          : "tank";
  if (r < 0.34) return "normal";
  if (r < 0.44) return "speedster";
  if (r < 0.55) return "tank";
  if (r < 0.65) return "shooter";
  if (r < 0.73) return "splitter";
  if (r < 0.8) return "healer";
  if (r < 0.87) return "berserker";
  if (r < 0.93) return "bomber";
  if (r < 0.97) return "sniper";
  return "necro";
}
function makeMiniBoss(x, y, n, idx) {
  const scale = 1 + Math.max(0, n - 5) * 0.08,
    hp = (620 + n * 55) * scale,
    defs = [
      {
        name: "IRON WARDEN",
        emoji: "⚔️",
        color: "#f59e0b",
        sp: 1.65,
        r: 28,
        pattern: "slam",
      },
      {
        name: "BLOOD EXECUTIONER",
        emoji: "🩸",
        color: "#dc2626",
        sp: 1.95,
        r: 27,
        pattern: "volley",
      },
    ];
  const d = defs[idx % defs.length];
  return {
    x,
    y,
    hp,
    max: hp,
    sp: d.sp,
    r: d.r,
    slowT: 0,
    variant: "miniboss",
    isMiniBoss: true,
    name: d.name,
    pattern: d.pattern,
    emoji: d.emoji,
    color: d.color,
    cd: 90,
    dmgMult: 2.1,
  };
}

addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    e.preventDefault();
    pauseGame();
    return;
  }
  if (paused) return;
  keys[e.key.toLowerCase()] = true;
  if (e.key.toLowerCase() === "f") toggleFS();
  const k = [
    "deacons",
    "ludwig",
    "gael",
    "rennala",
    "cinder",
    "midir",
    "nagato",
  ][+e.key - 1];
  if (k) raise(k);
});
addEventListener("keyup", (e) => (keys[e.key.toLowerCase()] = false));
const mouse = { x: 0, y: 0 };
c.addEventListener("mousemove", (e) => {
  const r = c.getBoundingClientRect();
  mouse.x = (e.clientX - r.left) * (VIEW_W / r.width) + camX;
  mouse.y = (e.clientY - r.top) * (VIEW_H / r.height) + camY;
});
c.addEventListener("click", () => {
  if (paused) return;
  const a = Math.atan2(mouse.y - P.y, mouse.x - P.x);
  B.push({
    x: P.x,
    y: P.y,
    vx: Math.cos(a) * 9,
    vy: Math.sin(a) * 9,
    dmg: 28,
    color: "#a855f7",
    r: 6,
    magic: true,
  });
  sfx.shoot();
});

const BOSS_TYPES = [
  "bishop",
  "paladin",
  "mage",
  "dragon",
  "demon",
  "void",
  "golem",
  "reaper",
  "seraph",
  "titan",
  "tempest",
  "eclipse",
];
const BOSS_INFO = {
  bishop: [1.2, "👑", "#f8fafc", "HOLY BISHOP"],
  paladin: [1.45, "🛡️", "#f59e0b", "HOLY PALADIN"],
  mage: [1.25, "🔮", "#eab308", "HOLY MAGE"],
  dragon: [1.9, "🐉", "#ef4444", "ANCIENT DRAGON"],
  demon: [1.65, "😈", "#a855f7", "DEMON LORD"],
  void: [1.55, "🌀", "#8b5cf6", "VOID LORD"],
  golem: [2.5, "🗿", "#78716c", "ANCIENT GOLEM"],
  reaper: [1.6, "💀", "#111827", "SOUL REAPER"],
  seraph: [1.8, "👼", "#fde68a", "ABYSSAL SERAPH"],
  titan: [2.4, "👹", "#b91c1c", "CRIMSON TITAN"],
  tempest: [1.75, "⛈️", "#38bdf8", "TEMPEST SOVEREIGN"],
  eclipse: [2.2, "🌑", "#6d28d9", "ECLIPSE OVERLORD"],
};
function pickRandomBoss() {
  const pool = BOSS_TYPES.filter((t) => t !== lastBossKey);
  const c2 = pool[(R() * pool.length) | 0];
  lastBossKey = c2;
  return c2;
}

function edgeSpawn() {
  // Spawn from varied perimeter lanes, with a generous player exclusion radius.
  for (let tries = 0; tries < 40; tries++) {
    const side = (R() * 4) | 0,
      pad = 70;
    const q =
      side === 0
        ? { x: pad + R() * (W - 2 * pad), y: pad }
        : side === 1
          ? { x: W - pad, y: pad + R() * (H - 2 * pad) }
          : side === 2
            ? { x: pad + R() * (W - 2 * pad), y: H - pad }
            : { x: pad, y: pad + R() * (H - 2 * pad) };
    if (Math.hypot(q.x - P.x, q.y - P.y) > Math.min(W, H) * 0.34) return q;
  }
  return { x: 70 + R() * (W - 140), y: 70 + R() * (H - 140) };
}
function spawn(n) {
  if (n % 10 === 0) {
    const tier = (n / 10) | 0,
      scaling = 1 + (tier - 1) * 0.45,
      t = pickRandomBoss(),
      info = BOSS_INFO[t],
      hp = (2200 + n * 175) * info[0] * scaling;
    boss = {
      x: W / 2,
      y: H / 2,
      hp,
      max: hp,
      sp: Math.min(
        2.2,
        (t === "golem" || t === "titan"
          ? 0.65
          : t === "void" || t === "tempest"
            ? 1.55
            : 1.05) * scaling,
      ),
      r: t === "dragon" || t === "titan" ? 46 : t === "golem" ? 50 : 40,
      isBoss: true,
      t,
      tier,
      scaling,
      healCd: 0,
      beamCd: 0,
      buff: 370,
      buff2: 370 * 370,
      spinCd: 0,
      stage: 0,
      slow: 320,
      emoji: info[1],
      color: info[2],
      name: info[3] + " T" + tier,
      summonCd: 0,
      tpCd: 0,
      slamCd: 0,
      drainCd: 0,
      orbCd: 0,
    };
    E.push(boss);
    sfx.roar();
    const cnt = 6 + (n - 1) * 2;
    for (let i = 0; i < cnt; i++) {
      const rn = (i / 12) | 0,
        a = ((i % 12) / 12) * CROSS,
        dst = 130 + rn * 60;
      const e = makeEnemy(
        W / 2 + Math.cos(a) * dst,
        H / 2 + Math.sin(a) * dst,
        n,
        pickVariant(n),
      );
      cl(e);
      E.push(e);
    }
    const bn = document.getElementById("bossName");
    bn.textContent = "👑 " + boss.name + " WAVE " + n + " + " + cnt;
    bn.style.display = "block";
    document.getElementById("bossBar").style.display = "block";
  } else if (n % 5 === 0) {
    sfx.mini();
    const mb1 = makeMiniBoss(W * 0.32, H * 0.28, n, 0),
      mb2 = makeMiniBoss(W * 0.68, H * 0.28, n, 1);
    E.push(mb1, mb2);
    for (let i = 0; i < 6 + n * 2; i++)
      E.push(makeEnemy(edgeSpawn().x, edgeSpawn().y, n, pickVariant(n)));
    const bn = document.getElementById("bossName");
    bn.textContent =
      "⚔️ MINI-BOSSES: " + mb1.name + " & " + mb2.name + " (WAVE " + n + ")";
    bn.style.display = "block";
  } else {
    for (let i = 0; i < 5 + n * 2; i++) {
      const q = edgeSpawn();
      E.push(makeEnemy(q.x, q.y, n, pickVariant(n)));
    }
  }
}
spawn(1);
const COST = {
  deacons: 5,
  ludwig: 10,
  gael: 15,
  rennala: 22,
  cinder: 20,
  midir: 28,
  nagato: 30,
};
function raise(t) {
  if (souls < COST[t]) return;
  souls -= COST[t];
  sfx.summon();
  const b = { type: t, x: P.x + 40, y: P.y + 40, cd: 0 };
  if (t === "deacons")
    M.push({
      ...b,
      hp: 200,
      max: 200,
      sp: 2.2,
      r: 18,
      range: 280,
      emoji: "⛪",
      color: "#f59e0b",
      healTick: 0,
    });
  if (t === "ludwig")
    M.push({
      ...b,
      hp: 1000,
      max: 1000,
      sp: 2.0,
      r: 28,
      dmg: 85,
      emoji: "🐴",
      color: "#eab308",
      phase2: false,
      phaseTriggered: false,
      swipeCd: 0,
      comboCount: 0,
      leapCd: 120,
      rushCd: 0,
      greatswordCd: 0,
      waveCd: 140,
      beamCd: 200,
      crescentCd: 260,
    });
  if (t === "gael")
    M.push({
      ...b,
      hp: 1200,
      max: 1200,
      sp: 2.6,
      r: 26,
      dmg: 130,
      emoji: "💀",
      color: "#dc2626",
      phase: 1,
      phase2Triggered: false,
      phase3Triggered: false,
      p1Combo: 0,
      p1ComboCd: 0,
      lungeCd: 100,
      lx: 0,
      ly: 0,
      capeCd: 0,
      coronaCd: 150,
      crossbowCd: 0,
      crossbowBurst: 0,
      crossbowAngle: 0,
      skullCd: 180,
      flipCd: 220,
      flipT: 0,
      flipDx: 0,
      flipDy: 0,
      chainBoost: 1,
    });
  if (t === "cinder")
    M.push({
      ...b,
      hp: 1300,
      max: 1300,
      sp: 2.3,
      r: 26,
      dmg: 75,
      emoji: "⚡",
      color: "#f97316",
      weapon: "greatsword",
      wt: 0,
      combo: 0,
      timer: 0,
      cx: 0,
      cy: 0,
      ct: 0,
      state: "normal",
      beamT: 0,
      homingCd: 0,
      p2: false,
      p2Combo: 0,
      p2T: 0,
      dx: 0,
      dy: 0,
      dt: 0,
      lightCd: 0,
      skyCd: 120,
      // new rework fields
      thrustT: 0,
      spinT: 0,
      chargeT: 0,
      afterImg: [],
      landFx: 0,
    });
  if (t === "nagato")
    M.push({
      ...b,
      hp: 1350,
      max: 1350,
      sp: 2.3,
      r: 26,
      dmg: 80,
      emoji: "👁️",
      color: "#dc2626",
      combo: 0,
      timer: 0,
      devaCd: 60,
      pullCd: 90,
      ctCd: 180,
      asuraCd: 80,
      humanCd: 140,
      elemCd: 100,
      elemIdx: 0,
      animalDone: false,
      painDone: false,
      gedoActive: false,
      gedoDeaths: 0,
      gedoReq: 10,
      gedoKills: 0,
      gedoT: 0,
    });
  if (t === "rennala")
    M.push({
      ...b,
      hp: 950,
      max: 950,
      sp: 3.0,
      r: 24,
      dmg: 88,
      emoji: "🌙",
      color: "#93c5fd",
      combo: 0,
      timer: 0,
      comboCd: 0,
      stepCd: 90,
      volleyCd: 150,
      pulseCd: 280,
      phase2: false,
      phaseTriggered: false,
    });
  // ============ DARKEATER MIDIR ============
  if (t === "midir")
    M.push({
      ...b,
      hp: 1800,
      max: 1800,
      sp: 1.7,
      r: 42,
      dmg: 145,
      emoji: "🐉",
      color: "#6d28d9",
      clawCd: 0,
      tailCd: 120,
      breathCd: 180,
      chargeCd: 200,
      humanityCd: 240,
      laserCd: 350,
      enraged: false,
      enrageTriggered: false,
      combatPhase: 0,
    });
}

const chibakuZones = [];

// ============ UPDATE ============
function update() {
  if (paused) return;
  const activeEncounter = E.some((e) => e.hp > 0 && (e.isBoss || e.isMiniBoss));
  if (activeEncounter !== encounterUI) {
    encounterUI = activeEncounter;
    document
      .getElementById("btnBar")
      .classList.toggle("encounter-hidden", encounterUI);
  }
  let sp = P.sp;
  if (
    boss &&
    boss.hp > 0 &&
    boss.t === "bishop" &&
    D2(P, boss) < boss.slow * boss.slow
  )
    sp *= 0.6;
  if (keys["w"] || keys["arrowup"]) P.y -= sp;
  if (keys["s"] || keys["arrowdown"]) P.y += sp;
  if (keys["a"] || keys["arrowleft"]) P.x -= sp;
  if (keys["d"] || keys["arrowright"]) P.x += sp;
  cl(P);

  narakaInstantRevive();

  // BOSS AI
  if (boss && boss.hp > 0) {
    const bs = boss.scaling || 1;
    if (--boss.healCd <= 0) {
      boss.healCd = 55;
      const b2 = boss.buff2;
      for (const e of E)
        if (e !== boss && D2(e, boss) < b2)
          e.hp = Math.min(e.max, e.hp + 35 * bs);
      boss.hp = Math.min(boss.max, boss.hp + 25 * bs);
    }
    const b = boss;
    if (b.t === "paladin" && --b.spinCd <= 0) {
      b.spinCd = 105;
      slash(b.x, b.y, 0, "#f59e0b", 20);
      if (D2(P, b) < 165 * 165) P.hp -= 35 * bs;
      for (const m of M) if (D2(m, b) < 165 * 165) damageSummon(m, 35 * bs);
      ring(b.x, b.y, 16, "#f59e0b", 110, 4);
    }
    if (b.t === "mage" && --b.beamCd <= 0) {
      b.beamCd = 80;
      b.stage = (b.stage + 1) % 3;
      const w = [36, 68, 120][b.stage],
        d = [20, 40, 70][b.stage] * bs,
        t =
          M.find((m) => m.type === "gael") ||
          M.find((m) => m.type === "midir") ||
          M.find((m) => m.type === "ludwig") ||
          P;
      beam(b.x, b.y, Math.atan2(t.y - b.y, t.x - b.x), w, d, "boss");
    }
    if (b.t === "dragon") {
      if (--b.beamCd <= 0) {
        b.beamCd = 135;
        const t =
          M.find((m) => m.type === "cinder") ||
          M.find((m) => m.type === "midir") ||
          M[0] ||
          P;
        beam(b.x, b.y, Math.atan2(t.y - b.y, t.x - b.x), 110, 9 * bs, "dragon");
      }
      if (--b.slamCd <= 0) {
        b.slamCd = 260;
        slash(b.x, b.y, 0, "#ef4444", 25);
        ring(b.x, b.y, 20, "#ef4444", 190, 5);
        if (D2(P, b) < 215 * 215) P.hp -= 42 * bs;
        for (const m of M) if (D2(m, b) < 215 * 215) damageSummon(m, 42 * bs);
      }
    }
    if (b.t === "demon" && --b.summonCd <= 0) {
      b.summonCd = 260;
      for (let i = 0; i < 6; i++) {
        const e = makeEnemy(
          b.x + (R() - 0.5) * 130,
          b.y + (R() - 0.5) * 130,
          wave,
          pickVariant(wave),
        );
        E.push(e);
      }
    }
    if (b.t === "void") {
      if (--b.tpCd <= 0) {
        b.tpCd = 210;
        b.x = R() * (W - 100) + 50;
        b.y = R() * (H - 100) + 50;
      }
      if (--b.orbCd <= 0) {
        b.orbCd = 150;
        for (let i = 0; i < 10; i++) {
          const a = Math.atan2(P.y - b.y, P.x - b.x) + (i - 4.5) * 0.16;
          EB.push({
            x: b.x,
            y: b.y,
            vx: Math.cos(a) * 4.5,
            vy: Math.sin(a) * 4.5,
            dmg: 16 * bs,
            color: "#8b5cf6",
            r: 8,
            homing: true,
          });
        }
      }
    }
    if (b.t === "golem" && --b.slamCd <= 0) {
      b.slamCd = 165;
      slash(b.x, b.y, 0, "#78716c", 25);
      ring(b.x, b.y, 25, "#78716c", 230, 6);
      if (D2(P, b) < 250 * 250) P.hp -= 75 * bs;
      for (const m of M) if (D2(m, b) < 250 * 250) damageSummon(m, 75 * bs);
    }
    if (b.t === "reaper" && --b.drainCd <= 0) {
      b.drainCd = 210;
      const v = M.slice(0, 6);
      for (const m of v) {
        damageSummon(m, 55 * bs);
        b.hp = Math.min(b.max, b.hp + 40 * bs);
      }
    }
    if (b.t === "seraph" && --b.orbCd <= 0) {
      b.orbCd = 120;
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * CROSS;
        EB.push({
          x: b.x,
          y: b.y,
          vx: Math.cos(a) * 5.5,
          vy: Math.sin(a) * 5.5,
          dmg: 18 * bs,
          color: "#fde68a",
          r: 7,
        });
      }
      ring(b.x, b.y, 18, "#fde68a", 160, 5);
    }
    if (b.t === "titan" && --b.slamCd <= 0) {
      b.slamCd = 150;
      sfx.boom();
      slash(b.x, b.y, 0, "#ef4444", 24);
      ring(b.x, b.y, 24, "#ef4444", 220, 6);
      if (D2(P, b) < 235 * 235) P.hp -= 85 * bs;
      for (const m of M) if (D2(m, b) < 235 * 235) damageSummon(m, 85 * bs);
    }
    if (b.t === "tempest" && --b.beamCd <= 0) {
      b.beamCd = 110;
      const a = Math.atan2(P.y - b.y, P.x - b.x);
      beam(b.x, b.y, a, 95, 8 * bs, "boss");
      for (let i = -2; i <= 2; i++)
        EB.push({
          x: b.x,
          y: b.y,
          vx: Math.cos(a + i * 0.22) * 6,
          vy: Math.sin(a + i * 0.22) * 6,
          dmg: 15 * bs,
          color: "#38bdf8",
          r: 7,
        });
    }
    if (b.t === "eclipse" && --b.tpCd <= 0) {
      b.tpCd = 180;
      b.x = R() * (W - 120) + 60;
      b.y = R() * (H - 120) + 60;
      ring(b.x, b.y, 20, "#a855f7", 150, 5);
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * CROSS;
        EB.push({
          x: b.x,
          y: b.y,
          vx: Math.cos(a) * 5,
          vy: Math.sin(a) * 5,
          dmg: 17 * bs,
          color: "#a855f7",
          r: 8,
          homing: true,
        });
      }
    }
  }

  // Beams
  for (const b of Bm) {
    const w = b.width || 60,
      hw = w * 0.62;
    if (b.cinder || b.ludwig || b.ludwigHoly || b.midir) {
      for (const e of E) if (distToBeam(e.x, e.y, b) < hw + e.r) e.hp -= b.dmg;
    } else {
      const preta = M.find(
        (m) =>
          m.type === "pain" &&
          m.painType === "PRETA" &&
          m.hp > 0 &&
          distToBeam(m.x, m.y, b) < w + 140,
      );
      if (preta) {
        preta.hp = Math.min(preta.max, preta.hp + preta.max * 0.005);
        const nag = M.find((m) => m.type === "nagato" && m.hp > 0);
        if (nag) absorbHealNagato(nag);
        continue;
      }
      if (distToBeam(P.x, P.y, b) < hw + P.r) P.hp -= b.dmg * 0.05;
      for (const m of M)
        if (distToBeam(m.x, m.y, b) < hw + m.r) damageSummon(m, b.dmg * 0.05);
    }
  }

  // Enemy bullets
  for (const b of EB) {
    const nag = M.find((m) => m.type === "nagato" && m.hp > 0);
    const preta = M.find(
      (m) =>
        m.type === "pain" &&
        m.painType === "PRETA" &&
        m.hp > 0 &&
        (b.x - m.x) ** 2 + (b.y - m.y) ** 2 < 170 * 170,
    );
    if (preta) {
      b.dead = true;
      sfx.absorb();
      preta.hp = Math.min(preta.max, preta.hp + preta.max * 0.02);
      if (nag) pretraHealNaraka(nag);
      continue;
    }
    if (nag && (b.x - nag.x) ** 2 + (b.y - nag.y) ** 2 < 150 * 150) {
      b.dead = true;
      absorbHealNagato(nag);
      continue;
    }
    if (b.homing) {
      const t = M[0] || P,
        a = Math.atan2(t.y - b.y, t.x - b.x),
        cur = Math.atan2(b.vy, b.vx);
      let diff = a - cur;
      if (diff > Math.PI) diff -= CROSS;
      if (diff < -Math.PI) diff += CROSS;
      const na = cur + Math.max(-0.2, Math.min(0.2, diff)),
        s = Math.hypot(b.vx, b.vy);
      b.vx = Math.cos(na) * s;
      b.vy = Math.sin(na) * s;
    }
    b.x += b.vx;
    b.y += b.vy;
    if ((b.x - P.x) ** 2 + (b.y - P.y) ** 2 < (b.r + P.r) ** 2) {
      P.hp -= b.dmg;
      b.dead = true;
      sfx.hit();
    }
    for (const m of M)
      if ((b.x - m.x) ** 2 + (b.y - m.y) ** 2 < (b.r + m.r) ** 2) {
        damageSummon(m, b.dmg);
        b.dead = true;
        break;
      }
  }
  EB = EB.filter(
    (b) => !b.dead && b.x > -50 && b.x < W + 50 && b.y > -50 && b.y < H + 50,
  );

  // Chibaku
  if (chibakuZones.length) {
    for (const z of chibakuZones) {
      z.life--;
      const r2 = z.radius * z.radius;
      for (const e of E) {
        if (e.hp <= 0) continue;
        const dx = z.x - e.x,
          dy = z.y - e.y,
          d2 = dx * dx + dy * dy;
        if (d2 < r2 && d2 > 25) {
          const pull = Math.min(7, 3 + z.life * 0.02),
            d = Math.sqrt(d2);
          e.x += (dx / d) * pull;
          e.y += (dy / d) * pull;
          cl(e);
        }
      }
    }
    for (let i = chibakuZones.length - 1; i >= 0; i--)
      if (chibakuZones[i].life <= 0) chibakuZones.splice(i, 1);
  }

  // Player bullets
  for (const b of B) {
    if (b.gedo) {
      b.life--;
      b.zig = (b.zig || 0) + 0.25;
      const aliveE = E.filter((e) => e.hp > 0);
      if (aliveE.length) {
        const tgt =
          aliveE.find((e) => b.owner && D2(e, b.owner) < 420 * 420) ||
          aliveE[0];
        const a = Math.atan2(tgt.y - b.y, tgt.x - b.x) + Math.sin(b.zig) * 0.55;
        b.vx = Math.cos(a) * 9.5;
        b.vy = Math.sin(a) * 9.5;
      }
      b.x += b.vx;
      b.y += b.vy;
      cl(b);
      if ((b.trailCd = (b.trailCd || 0) - 1) <= 0) {
        b.trailCd = 2;
        Pt.push({
          x: b.x,
          y: b.y,
          vx: (R() - 0.5) * 1.8,
          vy: (R() - 0.5) * 1.8,
          life: 20,
          c: R() < 0.5 ? "#a855f7" : "#e9d5ff",
        });
        if (R() < 0.16) sfx.gedoTrail();
      }
      for (const e of E) {
        if (
          e.hp > 0 &&
          !e.isBoss &&
          (b.x - e.x) ** 2 + (b.y - e.y) ** 2 < (e.r + 30) ** 2
        ) {
          e.hp -= 9999;
          if (b.owner) b.owner.gedoKills++;
        } else if (
          e.hp > 0 &&
          e.isBoss &&
          (b.x - e.x) ** 2 + (b.y - e.y) ** 2 < (e.r + 42) ** 2
        )
          e.hp -= 18;
      }
      if (b.life <= 0) {
        b.dead = true;
        if (b.owner && b.owner.gedoActive) resolveGedoOutcome(b.owner);
      }
      continue;
    }
    if (b.boomerang) {
      b.life--;
      b.x += b.vx;
      b.y += b.vy;
      if (b.life < 40 && b.owner && b.owner.hp > 0) {
        const a = Math.atan2(b.owner.y - b.y, b.owner.x - b.x);
        b.vx = Math.cos(a) * 10;
        b.vy = Math.sin(a) * 10;
        if (D2(b, b.owner) < 900) b.dead = true;
      }
      for (const e of E) {
        if ((b.x - e.x) ** 2 + (b.y - e.y) ** 2 < (e.r + b.r) ** 2) {
          if (!b.hit) b.hit = new Set();
          if (b.hit.has(e)) continue;
          b.hit.add(e);
          dmgE(e, b.dmg, 10, b.owner);
          // GAEL HOLY DISK REGEN NERFED: 20% -> 10%
          if (b.gaelDisk && b.owner && b.owner.hp > 0) {
            b.owner.hp = Math.min(b.owner.max, b.owner.hp + b.owner.max * 0.1);
            sfx.heal();
          }
        }
      }
      continue;
    }
    if (b.darkSkull) {
      b.life--;
      const tg = b.homing && nearest(b);
      if (tg) {
        const a = Math.atan2(tg.y - b.y, tg.x - b.x),
          cur = Math.atan2(b.vy, b.vx);
        let diff = a - cur;
        if (diff > Math.PI) diff -= CROSS;
        if (diff < -Math.PI) diff += CROSS;
        const na = cur + Math.max(-0.22, Math.min(0.22, diff)),
          s = Math.hypot(b.vx, b.vy);
        b.vx = Math.cos(na) * s;
        b.vy = Math.sin(na) * s;
      }
      b.x += b.vx;
      b.y += b.vy;
      for (const e of E)
        if ((b.x - e.x) ** 2 + (b.y - e.y) ** 2 < (e.r + b.r) ** 2) {
          b.dead = true;
          lightningBoom(b.x, b.y, 160, b.dmg, "#a855f7");
          break;
        }
      if (b.life <= 0 && !b.dead) {
        b.dead = true;
        lightningBoom(b.x, b.y, 130, b.dmg * 0.7, "#7e22ce");
      }
      continue;
    }
    const tg = b.homing && nearest(b);
    if (tg) {
      const a = Math.atan2(tg.y - b.y, tg.x - b.x),
        cur = Math.atan2(b.vy, b.vx);
      let diff = a - cur;
      if (diff > Math.PI) diff -= CROSS;
      if (diff < -Math.PI) diff += CROSS;
      const na = cur + Math.max(-0.3, Math.min(0.3, diff)),
        s = Math.hypot(b.vx, b.vy);
      b.vx = Math.cos(na) * s;
      b.vy = Math.sin(na) * s;
    }
    b.x += b.vx;
    b.y += b.vy;
    if (b.lightning) {
      if (R() < 0.4)
        Pt.push({
          x: b.x,
          y: b.y,
          vx: (R() - 0.5) * 2,
          vy: (R() - 0.5) * 2,
          life: 12,
          c: b.lightning ? "#fef08a" : "#fde047",
        });
    }
    for (const e of E) {
      if ((b.x - e.x) ** 2 + (b.y - e.y) ** 2 >= (e.r + b.r) ** 2) continue;
      if (b.lightning) {
        b.dead = true;
        lightningBoom(b.x, b.y, 180, 220, "#fde047");
        break;
      }
      if (b.skyLightning) {
        b.dead = true;
        skyBoom(b.x, b.y, 140);
        break;
      }
      if (b.asuraMissile) {
        b.dead = true;
        lightningBoom(b.x, b.y, 130, 145, "#f97316");
        break;
      }
      if (b.lunarBolt) {
        b.dead = true;
        lightningBoom(b.x, b.y, 110, 120, "#93c5fd");
        for (const en of E)
          if (D2(en, b) < 140 * 140) en.slowT = Math.max(en.slowT || 0, 90);
        break;
      }
      if (b.moonlight) {
        b.dead = true;
        lightningBoom(b.x, b.y, 130, 150, "#fef08a");
        break;
      }
      if (b.humanity) {
        b.dead = true;
        lightningBoom(b.x, b.y, 140, b.dmg, "#7e22ce");
        break;
      }
      if (b.chibaku) {
        b.dead = true;
        for (const en of E) {
          const a = Math.atan2(b.y - en.y, b.x - en.x);
          en.x += Math.cos(a) * 140;
          en.y += Math.sin(a) * 140;
          cl(en);
          dmgE(en, 240, 10, null);
        }
        ring(b.x, b.y, 25, "#111827", 200, 5);
        chibakuZones.push({ x: b.x, y: b.y, life: 120, radius: 260, dmg: 240 });
        break;
      }
      if (b.pierce) {
        if (!b.hit) b.hit = new Set();
        if (b.hit.has(e)) continue;
        b.hit.add(e);
      } else b.dead = true;
      let d = b.dmg;
      if (boss && boss.hp > 0 && D2(e, boss) < boss.buff2) {
        if (boss.t === "paladin") d *= 0.5;
        if (boss.t === "bishop") d *= 0.6;
      }
      if (e.isBoss && boss.t === "paladin") d *= 0.7;
      e.hp -= d;
    }
    if (b.pierce && --b.life <= 0) b.dead = true;
    if (
      b.chibaku &&
      (b.x <= b.r + 2 ||
        b.x >= W - b.r - 2 ||
        b.y <= b.r + 2 ||
        b.y >= H - b.r - 2)
    ) {
      chibakuZones.push({
        x: Math.max(30, Math.min(W - 30, b.x)),
        y: Math.max(30, Math.min(H - 30, b.y)),
        life: 120,
        radius: 260,
        dmg: 240,
      });
      sfx.boom();
      b.dead = true;
    }
  }
  B = B.filter(
    (b) => !b.dead && b.x > -60 && b.x < W + 60 && b.y > -60 && b.y < H + 60,
  );
  if (Pt.length > 300) Pt.splice(0, Pt.length - 300);

  // Enemy AI
  const eTarget =
    M.find((m) => m.type === "nagato") ||
    M.find((m) => m.type === "midir") ||
    M.find((m) => m.type === "pain") ||
    M.find((m) => m.type === "gael") ||
    M.find((m) => m.type === "ludwig") ||
    M.find((m) => m.type === "rennala") ||
    M.find((m) => m.type === "cinder") ||
    M.find((m) => m.type === "deacons") ||
    M.find((m) => m.type === "converted") ||
    P;
  for (const e of E) {
    if (e.slowT > 0) e.slowT--;
    const dm = e.dmgMult || 1;
    if (e.variant === "healer" && --e.healCd <= 0) {
      e.healCd = 55;
      for (const o of E)
        if (o !== e && D2(o, e) < 210 * 210) o.hp = Math.min(o.max, o.hp + 26);
    }
    if (e.variant === "necro" && --e.summonCd <= 0 && E.length < 85) {
      e.summonCd = 190;
      const s = makeEnemy(
        e.x + (R() - 0.5) * 40,
        e.y + (R() - 0.5) * 40,
        wave,
        "berserker",
      );
      s.hp = s.max = s.max * 0.55;
      E.push(s);
    }
    if (e.variant === "sniper") {
      const t = M[0] || P,
        d2 = D2(e, t);
      if (d2 > 430 * 430) moveTo(e, t, e.sp);
      else if (d2 < 280 * 280) {
        const a = Math.atan2(e.y - t.y, e.x - t.x);
        e.x += Math.cos(a) * e.sp;
        e.y += Math.sin(a) * e.sp;
        cl(e);
      }
      if (--e.shootCd <= 0) {
        e.shootCd = 135;
        const a = Math.atan2(t.y - e.y, t.x - e.x);
        EB.push({
          x: e.x,
          y: e.y,
          vx: Math.cos(a) * 8.5,
          vy: Math.sin(a) * 8.5,
          dmg: (16 + wave * 1.1) * dm,
          color: "#c084fc",
          r: 6,
        });
      }
      continue;
    }
    if (e.variant === "shooter") {
      const t = M[0] || P,
        d2 = D2(e, t);
      if (d2 > 350 * 350) moveTo(e, t, e.sp);
      else if (d2 < 250 * 250) {
        const a = Math.atan2(e.y - t.y, e.x - t.x);
        e.x += Math.cos(a) * e.sp;
        e.y += Math.sin(a) * e.sp;
        cl(e);
      }
      if (--e.shootCd <= 0) {
        e.shootCd = 110;
        const a = Math.atan2(t.y - e.y, t.x - e.x);
        EB.push({
          x: e.x,
          y: e.y,
          vx: Math.cos(a) * 5.5,
          vy: Math.sin(a) * 5.5,
          dmg: (11 + wave * 0.75) * dm,
          color: "#a3e635",
          r: 6,
        });
      }
      continue;
    }

    let t = eTarget;
    let s = e.sp * (e.slowT > 0 ? 0.45 : 1);
    if (boss && boss.hp > 0 && e !== boss && D2(e, boss) < boss.buff2) {
      if (boss.t === "bishop") {
        s *= 1.5;
      }
    }
    moveTo(e, t, s);

    if (e.isMiniBoss && --e.cd <= 0) {
      e.cd = 115;
      const a = Math.atan2(t.y - e.y, t.x - e.x);
      if (e.pattern === "slam") {
        slash(e.x, e.y, a, e.color, 18);
        ring(e.x, e.y, 14, e.color, 130, 4);
        if (D2(P, e) < 160 * 160) P.hp -= 22 * dm;
        for (const m of M) if (D2(m, e) < 160 * 160) damageSummon(m, 22 * dm);
      } else {
        for (let i = -2; i <= 2; i++)
          EB.push({
            x: e.x,
            y: e.y,
            vx: Math.cos(a + i * 0.2) * 6,
            vy: Math.sin(a + i * 0.2) * 6,
            dmg: 14 * dm,
            color: e.color,
            r: 7,
          });
      }
    }

    if (e.variant === "bomber" && D2(e, t) < (e.r + t.r + 18) ** 2) {
      lightningBoom(e.x, e.y, 110, 0, "#f43f5e");
      if (D2(P, e) < 125 * 125) P.hp -= 28 * dm;
      for (const m of M) if (D2(m, e) < 125 * 125) damageSummon(m, 28 * dm);
      e.hp = 0;
      continue;
    }

    if (D2(e, P) < (e.r + P.r) ** 2) P.hp -= 0.42 * dm;
    for (const m of M)
      if (D2(e, m) < (e.r + m.r) ** 2) damageSummon(m, 0.52 * dm);
    if (e.isBoss) {
      for (const m of M) if (D2(e, m) < (e.r + m.r) ** 2) damageSummon(m, 0.75);
      if (D2(e, P) < (e.r + P.r) ** 2) P.hp -= 0.75;
    }
  }

  // Summon AI
  for (const m of M) {
    if (!m || m.hp <= 0) continue;
    let ms = m.sp || 2;
    if (
      boss &&
      boss.hp > 0 &&
      boss.t === "bishop" &&
      D2(m, boss) < boss.slow * boss.slow
    )
      ms *= 0.6;

    if (m.type === "deacons") {
      const h = dHeal() / 60;
      for (const o of M)
        if (o !== m && o.hp > 0 && D2(o, m) < m.range * m.range)
          o.hp = Math.min(o.max, o.hp + h);
      if (D2(P, m) < m.range * m.range) P.hp = Math.min(P.max, P.hp + h);
      const th = boss && boss.hp > 0 ? boss : nearest(m);
      if (th) {
        const dt = D2(th, m);
        if (dt > 320 * 320) moveTo(m, th, ms * 0.9);
        else if (dt < 200 * 200) {
          const a = Math.atan2(m.y - th.y, m.x - th.x);
          m.x += Math.cos(a) * ms * 0.6;
          m.y += Math.sin(a) * ms * 0.6;
          cl(m);
        }
      }
      continue;
    }
    if (m.type === "converted") {
      const n = boss && boss.hp > 0 ? boss : nearest(m);
      if (!n) continue;
      moveTo(m, n, ms);
      if (D2(n, m) < 900) n.hp -= m.dmg || 1;
      continue;
    }
    if (m.type === "beast") {
      const n = boss && boss.hp > 0 ? boss : nearest(m);
      if (!n) continue;
      moveTo(m, n, ms);
      if (--m.cd <= 0 && D2(n, m) < 170 * 170) {
        m.cd = 180;
        slash(m.x, m.y, Math.atan2(n.y - m.y, n.x - m.x), m.color, 16);
        hitAll(m, 120, m.dmg, 18);
      }
      continue;
    }
    if (m.type === "pain") {
      const n = boss && boss.hp > 0 ? boss : nearest(m);
      if (!n) continue;
      const d2p = D2(n, m),
        aP = Math.atan2(n.y - m.y, n.x - m.x);
      m.cd--;
      m.subCd = (m.subCd || 0) - 1;
      if (m.painType === "DEVA") {
        if (d2p > 240 * 240) moveTo(m, n, ms);
        else if (d2p < 130 * 130) {
          m.x -= Math.cos(aP) * ms * 0.8;
          m.y -= Math.sin(aP) * ms * 0.8;
          cl(m);
        }
        if (m.cd <= 0) {
          m.cd = 280;
          addFx(m.x, m.y, "#ef4444", 230, 34, "nova");
          addFx(m.x, m.y, "#fff1f2", 145, 20, "flash");
          slash(m.x, m.y, 0, "#ef4444", 22);
          ring(m.x, m.y, 18, "#ef4444", 160, 6);
          for (const e of E)
            if (D2(e, m) < 210 * 210) {
              const a = Math.atan2(e.y - m.y, e.x - m.x);
              e.x += Math.cos(a) * 135;
              e.y += Math.sin(a) * 135;
              cl(e);
              dmgE(e, m.dmg * 1.15, 15, m);
            }
        }
        if (m.subCd <= 0 && d2p < 340 * 340) {
          m.subCd = 320;
          addFx(m.x, m.y, "#38bdf8", 340, 32, "gravity");
          addFx(m.x, m.y, "#e0f2fe", 220, 18, "flash");
          ring(m.x, m.y, 16, "#38bdf8", 180, -5);
          for (const e of E)
            if (D2(e, m) < 340 * 340) {
              const a = Math.atan2(m.y - e.y, m.x - e.x);
              e.x += Math.cos(a) * 115;
              e.y += Math.sin(a) * 115;
              cl(e);
              dmgE(e, m.dmg * 0.95, 0, m);
            }
        }
      } else if (m.painType === "ASURA") {
        if (d2p > 290 * 290) moveTo(m, n, ms);
        else {
          const sf = aP + Math.PI / 2;
          m.x += Math.cos(sf) * ms * 0.85;
          m.y += Math.sin(sf) * ms * 0.85;
          cl(m);
        }
        if (m.cd <= 0) {
          m.cd = 230;
          for (let i = 0; i < 3; i++) {
            const a = aP + (i - 1) * 0.26;
            B.push({
              x: m.x,
              y: m.y,
              vx: Math.cos(a) * 8,
              vy: Math.sin(a) * 8,
              dmg: m.dmg * 0.95,
              color: "#f97316",
              r: 7,
              homing: true,
              life: 150,
              asuraMissile: true,
            });
          }
        }
      } else if (m.painType === "HUMAN") {
        moveTo(m, n, ms * 1.15);
        if (m.cd <= 0 && d2p < 105 * 105) {
          m.cd = 290;
          slash(m.x, m.y, aP, "#c084fc", 18);
          if (
            !n.isBoss &&
            !n.isMiniBoss &&
            n.hp < n.max * 0.45 &&
            M.filter((x) => x.type === "converted").length < 120
          ) {
            M.push({
              type: "converted",
              x: n.x,
              y: n.y,
              hp: 80 + wave * 6,
              max: 80 + wave * 6,
              sp: 2.4,
              r: 16,
              dmg: 1.8,
              emoji: "👹",
              color: "#a855f7",
            });
            n.hp = 0;
          } else dmgE(n, m.dmg * 1.45, 10, m);
        }
      } else if (m.painType === "ANIMAL") {
        moveTo(m, n, ms * 1.02);
        if (m.cd <= 0) {
          m.cd = 280;
          for (const o of M)
            if (o.type === "beast" && o.hp > 0)
              o.hp = Math.min(o.max, o.hp + 110);
          hitAll(m, 140, m.dmg * 0.85, 16);
        }
      } else if (m.painType === "PRETA") {
        const guard = m.parent && m.parent.hp > 0 ? m.parent : P;
        if (D2(guard, m) > 110 * 110) moveTo(m, guard, ms * 1.05);
        else moveTo(m, n, ms * 0.6);
        if (m.cd <= 0) {
          m.cd = 170;
          let absorbed = 0;
          for (const b of EB)
            if (D2(b, m) < 170 * 170) {
              b.dead = true;
              absorbed++;
            }
          if (absorbed) {
            m.hp = Math.min(m.max, m.hp + m.max * 0.02 * absorbed);
            if (m.parent && m.parent.hp > 0) pretraHealNaraka(m.parent);
          }
        }
      } else if (m.painType === "NARAKA") {
        if (d2p < 170 * 170) {
          m.x -= Math.cos(aP) * ms * 0.8;
          m.y -= Math.sin(aP) * ms * 0.8;
          cl(m);
        } else if (d2p > 280 * 280) moveTo(m, n, ms * 0.8);
        if (m.cd <= 0) {
          m.cd = 300;
          ring(m.x, m.y, 14, "#f8fafc", 130, 3);
          for (const o of M)
            if (
              o !== m &&
              (o.type === "pain" ||
                o.type === "beast" ||
                o.type === "nagato") &&
              o.hp > 0
            )
              o.hp = Math.min(o.max, o.hp + 110);
          if (
            deadPainBodies.length &&
            M.filter((o) => o.type === "pain" && o.hp > 0).length < 6
          )
            narakaInstantRevive();
        }
      }
      if (d2p < 42 * 42) n.hp -= m.dmg * 0.035;
      continue;
    }

    if (m.type === "cinder" && !m.p2 && m.hp <= m.max * 0.1 && m.hp > 0) {
      m.p2 = true;
      m.hp = m.max;
      m.weapon = "p2";
      m.p2Combo = 0;
      m.p2T = 0;
      m.state = "p2";
      sfx.cinderAwaken();
      addFx(m.x, m.y, "#fde047", 280, 40, "nova");
      addFx(m.x, m.y, "#ef4444", 200, 30, "aura");
      slash(m.x, m.y, 0, "#ef4444", 28);
      ring(m.x, m.y, 24, "#f97316", 180, 6);
      burst(m.x, m.y, 40, "#fde047", 14, 40);
    }

    const near = boss && boss.hp > 0 ? boss : nearest(m);
    if (!near) {
      if (D2(P, m) > 2500) moveTo(m, P, ms);
      continue;
    }
    const dist2 = D2(near, m),
      a = Math.atan2(near.y - m.y, near.x - m.x);

    if (m.type === "ludwig") {
      if (!m.phase2 && !m.phaseTriggered && m.hp <= m.max * 0.1 && m.hp > 0) {
        m.phase2 = true;
        m.phaseTriggered = true;
        m.hp = m.max;
        m.emoji = "⚔️";
        m.color = "#fde047";
        m.r = 30;
        sfx.holy();
        sfx.beast();
        burst(m.x, m.y, 55, "#fef08a", 14, 50);
        ring(m.x, m.y, 30, "#fef08a", 240, 7);
        slash(m.x, m.y, 0, "#fde047", 28);
      }
      if (!m.phase2) {
        m.swipeCd--;
        m.leapCd--;
        m.rushCd--;
        moveTo(m, near, ms * 1.1);
        if (dist2 < 150 * 150 && m.swipeCd <= 0) {
          m.comboCount = (m.comboCount || 0) + 1;
          if (m.comboCount >= 3) {
            m.swipeCd = 38;
            m.comboCount = 0;
            heroMelee(m.x, m.y, a, "#fb923c", 190, 1.2, 24);
            hitAll(m, 175, m.dmg * 1.5, 30);
          } else {
            m.swipeCd = 20;
            heroMelee(m.x, m.y, a, "#eab308", 145, 0.95, 18);
            hitAll(m, 130, m.dmg * 0.85, 18);
          }
        }
        if (m.leapCd <= 0 && E.filter((e) => D2(e, m) < 40000).length >= 2) {
          m.leapCd = 200;
          sfx.beast();
          m.x += Math.cos(a) * 60;
          m.y += Math.sin(a) * 60;
          cl(m);
          heroMeleeBurst(m.x, m.y, "#fb923c", 200, 22);
          for (const e of E)
            if (D2(e, m) < 200 * 200) dmgE(e, m.dmg * 1.8, 45, m);
        }
        if (m.rushCd <= 0 && dist2 < 90000) {
          m.rushCd = 240;
          m.x += Math.cos(a) * 100;
          m.y += Math.sin(a) * 100;
          cl(m);
          heroMeleeBurst(m.x, m.y, "#eab308", 140, 18);
          hitAll(m, 140, m.dmg * 0.7, 15);
        }
      } else {
        m.greatswordCd--;
        m.waveCd--;
        m.beamCd--;
        m.crescentCd--;
        moveTo(m, near, ms * 1.15);
        if (dist2 < 40000 && m.greatswordCd <= 0) {
          m.greatswordCd = 42;
          heroMelee(m.x, m.y, a, "#fde047", 205, 1.25, 26);
          heroMelee(m.x, m.y, a + 0.9, "#fef08a", 185, 1.0, 22);
          hitAll(m, 200, m.dmg * 1.6, 35);
        }
        if (m.waveCd <= 0 && dist2 < 176400) {
          m.waveCd = 170;
          for (let i = -1; i <= 1; i++) {
            const wa = a + i * 0.18;
            B.push({
              x: m.x,
              y: m.y,
              vx: Math.cos(wa) * 10,
              vy: Math.sin(wa) * 10,
              dmg: Math.round(m.dmg * 1.3),
              color: "#fef08a",
              r: 14,
              pierce: true,
              life: 45,
              moonlight: true,
              magic: true,
            });
          }
        }
        if (m.crescentCd <= 0 && dist2 < 90000) {
          m.crescentCd = 320;
          sfx.holy();
          ring(m.x, m.y, 28, "#fde047", 220, 7);
          for (const e of E)
            if (D2(e, m) < 220 * 220) dmgE(e, m.dmg * 1.4, 30, m);
          for (const o of M)
            if (o !== m && o.hp > 0 && D2(o, m) < 48400)
              o.hp = Math.min(o.max, o.hp + o.max * 0.04);
        }
        if (m.beamCd <= 0 && dist2 < 160000) {
          m.beamCd = 290;
          beam(m.x, m.y, a, 90, 6, "ludwigHoly");
        }
      }
      continue;
    }

    if (m.type === "gael") {
      if (
        m.phase === 1 &&
        !m.phase2Triggered &&
        m.hp <= m.max * 0.1 &&
        m.hp > 0
      ) {
        m.phase = 2;
        m.phase2Triggered = true;
        m.hp = m.max;
        m.emoji = "🗡️";
        m.color = "#b91c1c";
        m.r = 28;
        sfx.dark();
        sfx.holy();
        burst(m.x, m.y, 50, "#b91c1c", 14, 45);
        ring(m.x, m.y, 28, "#dc2626", 220, 7);
        slash(m.x, m.y, 0, "#fde047", 26);
      }
      if (
        m.phase === 2 &&
        !m.phase3Triggered &&
        m.hp <= m.max * 0.1 &&
        m.hp > 0
      ) {
        m.phase = 3;
        m.phase3Triggered = true;
        m.hp = m.max;
        m.emoji = "💀";
        m.color = "#7e22ce";
        m.r = 30;
        sfx.abyss();
        burst(m.x, m.y, 65, "#7e22ce", 15, 55);
        ring(m.x, m.y, 32, "#7e22ce", 260, 8);
        lightningBoom(m.x, m.y, 220, 80, "#7e22ce");
      }
      const boost = m.phase === 3 ? 1.55 : m.phase === 2 ? 1.2 : 1;
      if (m.phase === 1) {
        m.p1ComboCd--;
        m.lungeCd--;
        moveTo(m, near, ms * 1.15);
        if (m.lungeCd <= 0 && dist2 < 102400 && dist2 > 10000) {
          m.lungeCd = 140;
          m.x += Math.cos(a) * 80;
          m.y += Math.sin(a) * 80;
          cl(m);
          heroMelee(m.x, m.y, a, "#ef4444", 190, 1.0, 24);
          heroMeleeBurst(m.x, m.y, "#dc2626", 180, 18);
          hitAll(m, 180, m.dmg * 1.6, 32);
        }
        if (dist2 < 28900 && m.p1ComboCd <= 0) {
          m.p1Combo = (m.p1Combo || 0) + 1;
          if (m.p1Combo >= 4) {
            m.p1ComboCd = 34;
            m.p1Combo = 0;
            heroMeleeBurst(m.x, m.y, "#dc2626", 170, 24);
            hitAll(m, 170, m.dmg * 1.8, 30);
          } else {
            m.p1ComboCd = 16;
            heroMelee(
              m.x,
              m.y,
              a + (m.p1Combo % 2 ? 0.4 : -0.4),
              "#dc2626",
              150,
              1.0,
              18,
            );
            hitAll(m, 140, m.dmg * 0.9, 18);
          }
        }
        continue;
      }
      if (m.phase === 2) {
        m.capeCd--;
        m.coronaCd--;
        m.crossbowCd--;
        moveTo(m, near, ms * 1.15);
        if (dist2 < 40000 && m.capeCd <= 0) {
          m.capeCd = Math.round(34 / boost);
          heroMelee(m.x, m.y, a, "#b91c1c", 195, 1.2, 24);
          heroMelee(m.x, m.y, a + 0.3, "#fde047", 175, 1.0, 20);
          hitAll(m, 190, m.dmg * 1.4, 25);
        }
        if (m.coronaCd <= 0 && dist2 < 160000) {
          m.coronaCd = Math.round(180 / boost);
          B.push({
            x: m.x,
            y: m.y,
            vx: Math.cos(a) * 10,
            vy: Math.sin(a) * 10,
            dmg: m.dmg * 1.3,
            color: "#fde047",
            r: 16,
            boomerang: true,
            gaelDisk: true,
            life: 80,
            owner: m,
          });
        }
        if (m.crossbowCd <= 0 && dist2 < 144400) {
          m.crossbowCd = Math.round(200 / boost);
          m.crossbowBurst = 7;
          m.crossbowAngle = a;
        }
        if (m.crossbowBurst > 0) {
          m.crossbowBurst--;
          const ca = m.crossbowAngle + (R() - 0.5) * 0.25;
          B.push({
            x: m.x,
            y: m.y,
            vx: Math.cos(ca) * 10,
            vy: Math.sin(ca) * 10,
            dmg: m.dmg * 0.7,
            color: "#fde047",
            r: 5,
            life: 50,
          });
        }
        continue;
      }
      if (m.phase === 3) {
        m.skullCd--;
        m.flipCd--;
        m.capeCd--;
        if (m.flipT > 0) {
          m.flipT--;
          m.x += m.flipDx * 15;
          m.y += m.flipDy * 15;
          cl(m);
          if (m.flipT === 0) {
            heroMeleeBurst(m.x, m.y, "#7e22ce", 240, 26);
            lightningBoom(m.x, m.y, 220, m.dmg * 1.6, "#38bdf8");
            hitAll(m, 240, m.dmg * 1.7, 38);
          }
          continue;
        }
        moveTo(m, near, ms * 1.3);
        if (dist2 < 40000 && m.capeCd <= 0) {
          m.capeCd = Math.round(26 / boost);
          heroMelee(m.x, m.y, a, "#7e22ce", 205, 1.2, 24);
          heroMelee(m.x, m.y, a + 0.4, "#38bdf8", 185, 1.0, 22);
          hitAll(m, 200, m.dmg * 1.5, 28);
        }
        if (m.skullCd <= 0 && dist2 < 211600) {
          m.skullCd = Math.round(180 / boost);
          sfx.dark();
          for (let i = 0; i < 9; i++) {
            const sa = a + (i - 4) * 0.26;
            B.push({
              x: m.x,
              y: m.y,
              vx: Math.cos(sa) * 7,
              vy: Math.sin(sa) * 7,
              dmg: m.dmg * 1.1,
              color: "#7e22ce",
              r: 9,
              homing: true,
              life: 220,
              darkSkull: true,
            });
          }
        }
        if (m.flipCd <= 0 && dist2 > 22500) {
          m.flipCd = Math.round(240 / boost);
          m.flipT = 20;
          m.flipDx = Math.cos(a);
          m.flipDy = Math.sin(a);
          m.x -= m.flipDx * 90;
          m.y -= m.flipDy * 90;
          cl(m);
        }
        continue;
      }
    }

    // ============ DARKEATER MIDIR AI ============
    if (m.type === "midir") {
      // Abyssal Awakening at 50% HP
      if (!m.enraged && !m.enrageTriggered && m.hp <= m.max * 0.5 && m.hp > 0) {
        m.enraged = true;
        m.enrageTriggered = true;
        m.emoji = "🐲";
        m.color = "#4c1d95";
        m.r = 46;
        m.dmg = Math.round(m.dmg * 1.25);
        sfx.abyss();
        sfx.dragonRoar();
        burst(m.x, m.y, 60, "#6d28d9", 15, 50);
        burst(m.x, m.y, 45, "#ef4444", 12, 40);
        burst(m.x, m.y, 30, "#38bdf8", 10, 35);
        ring(m.x, m.y, 32, "#6d28d9", 260, 8);
        ring(m.x, m.y, 22, "#ef4444", 200, 7);
        slash(m.x, m.y, 0, "#6d28d9", 30);
        slash(m.x, m.y, Math.PI, "#ef4444", 30);
      }
      const boost = m.enraged ? 1.5 : 1;

      m.clawCd--;
      m.tailCd--;
      m.breathCd--;
      m.chargeCd--;
      m.humanityCd--;
      m.laserCd--;
      moveTo(m, near, ms);

      // Dragon Claw / Bite (primary melee)
      if (dist2 < 220 * 220 && m.clawCd <= 0) {
        m.clawCd = Math.round(38 / boost);
        heroMelee(m.x, m.y, a, "#6d28d9", 220, 1.1, 27);
        heroMelee(m.x, m.y, a + 0.5, "#4c1d95", 190, 0.9, 22);
        burst(m.x, m.y, 18, "#6d28d9", 12, 28);
        hitAll(m, 210, m.dmg * 1.3, 35);
      }

      // Tail Sweep (anti-flank, catches speedsters)
      if (m.tailCd <= 0 && E.filter((e) => D2(e, m) < 250 * 250).length >= 2) {
        m.tailCd = Math.round(140 / boost);
        heroMelee(m.x, m.y, a + Math.PI, "#4c1d95", 255, 1.65, 30);
        heroMeleeBurst(m.x, m.y, "#6d28d9", 230, 24);
        burst(m.x, m.y, 24, "#111827", 12, 32);
        hitAll(m, 250, m.dmg * 1.5, 45);
      }

      // Abyssal Fire Breath (wide arc AoE)
      if (m.breathCd <= 0 && dist2 < 300 * 300) {
        m.breathCd = Math.round(220 / boost);
        sfx.abyss();
        ring(m.x, m.y, 26, "#6d28d9", 250, 7);
        ring(m.x, m.y, 18, "#ef4444", 180, 6);
        burst(m.x, m.y, 30, "#6d28d9", 12, 35);
        const breathRad = m.enraged ? 260 : 210;
        for (const e of E)
          if (D2(e, m) < breathRad * breathRad) {
            dmgE(e, m.dmg * 1.1 * boost, 22, m);
            if (R() < 0.4) e.slowT = Math.max(e.slowT || 0, 90);
          }
      }

      // Dragon Charge / Slam (heavy knockback vs clusters)
      if (m.chargeCd <= 0 && dist2 > 100 * 100 && dist2 < 380 * 380) {
        m.chargeCd = Math.round(200 / boost);
        sfx.dragonRoar();
        m.x += Math.cos(a) * 120;
        m.y += Math.sin(a) * 120;
        cl(m);
        burst(m.x, m.y, 22, "#6d28d9", 12, 28);
        ring(m.x, m.y, 22, "#4c1d95", 200, 7);
        heroMelee(m.x, m.y, a, "#ef4444", 205, 1.0, 26);
        heroMeleeBurst(m.x, m.y, "#6d28d9", 200, 20);
        for (const e of E)
          if (D2(e, m) < 200 * 200) dmgE(e, m.dmg * 1.7, 50, m);
      }

      // Humanity Barrage (homing abyssal orbs)
      if (m.humanityCd <= 0 && dist2 < 400 * 400) {
        m.humanityCd = Math.round(240 / boost);
        sfx.dark();
        const count = m.enraged ? 7 : 5;
        for (let i = 0; i < count; i++) {
          const sa = a + (i - (count - 1) / 2) * 0.22;
          B.push({
            x: m.x,
            y: m.y,
            vx: Math.cos(sa) * 7,
            vy: Math.sin(sa) * 7,
            dmg: m.dmg * 0.75 * boost,
            color: "#6d28d9",
            r: 10,
            homing: true,
            life: 180,
            humanity: true,
          });
        }
        burst(m.x, m.y, 16, "#6d28d9", 10, 25);
      }

      // Abyssal Laser Beam (lane-clearing)
      if (m.laserCd <= 0 && dist2 < 450 * 450) {
        m.laserCd = Math.round(280 / boost);
        sfx.abyssLaser();
        beam(m.x, m.y, a, m.enraged ? 80 : 65, 7 * boost, "midir");
        burst(m.x, m.y, 20, "#6d28d9", 12, 30);
        slash(m.x, m.y, a, "#ef4444", 24);
      }
      continue;
    }

    if (m.type === "cinder") {
      // ===== PHASE 2: Lightning Lord =====
      if (m.p2) {
        m.lightCd--;
        m.skyCd--;
        // Homing lightning bolts
        if (m.lightCd <= 0) {
          m.lightCd = 160;
          sfx.cinderLightning();
          addFx(m.x, m.y, "#fef08a", 140, 22, "nova");
          const la = Math.atan2(near.y - m.y, near.x - m.x);
          for (let i = -1; i <= 1; i++) {
            B.push({
              x: m.x,
              y: m.y,
              vx: Math.cos(la + i * 0.18) * 12,
              vy: Math.sin(la + i * 0.18) * 12,
              dmg: 130,
              color: "#fde047",
              r: 11,
              lightning: true,
              life: 90,
            });
          }
        }
        // Sky lightning rain
        if (m.skyCd <= 0) {
          m.skyCd = 420;
          sfx.cinderRain();
          addFx(m.x, m.y, "#fde047", 280, 40, "aura");
          for (let i = 0; i < 50; i++) {
            const an = (R() - 0.5) * 2.2 - Math.PI / 2;
            B.push({
              x: m.x + (R() - 0.5) * 40,
              y: m.y - 30,
              vx: Math.cos(an) * 5.5,
              vy: Math.sin(an) * 5.5,
              dmg: 55,
              color: "#fef08a",
              r: 7,
              homing: true,
              life: 200,
              skyLightning: true,
            });
          }
        }
        // Combo + Dive
        if (m.state === "p2") {
          moveTo(m, near, ms * 1.45);
          if (--m.p2T <= 0 && dist2 < 52000) {
            if (m.p2Combo < 4) {
              cinderSweep(
                m.x,
                m.y,
                a + (m.p2Combo - 1.5) * 0.4,
                "#ef4444",
                230,
                24,
              );
              hitAll(m, 230, 140, 32);
              m.p2Combo++;
              m.p2T = 20;
            } else if (m.p2Combo === 4) {
              cinderSweep(m.x, m.y, 0, "#ef4444", 240, 28);
              cinderSweep(m.x, m.y, Math.PI, "#fde047", 200, 22);
              ring(m.x, m.y, 24, "#ef4444", 170, 6);
              hitAll(m, 210, 210, 42);
              m.p2Combo = 5;
              m.p2T = 35;
            } else {
              // Dive attack - clear arc
              m.state = "dive";
              m.dt = 28;
              sfx.cinderDive();
              const da = Math.atan2(near.y - m.y, near.x - m.x);
              m.dx = Math.cos(da);
              m.dy = Math.sin(da);
              // jump back first for clear wind-up
              m.x -= m.dx * 70;
              m.y -= m.dy * 70;
              cl(m);
              addFx(m.x, m.y, "#f97316", 100, 18, "ring");
            }
          }
        } else if (m.state === "dive") {
          // visible trail + accelerating dive
          if (m.dt % 3 === 0) {
            burst(m.x, m.y, 6, "#f97316", 6, 14);
            burst(m.x, m.y, 4, "#fde047", 4, 12);
          }
          const speed = 14 + (28 - m.dt) * 0.4;
          m.x += m.dx * speed;
          m.y += m.dy * speed;
          cl(m);
          m.dt--;
          hitAll(m, 90, 260, 35);
          if (m.dt <= 0) {
            // Landing explosion
            sfx.cinderLand();
            ring(m.x, m.y, 28, "#ef4444", 180, 7);
            addFx(m.x, m.y, "#f97316", 220, 32, "nova");
            burst(m.x, m.y, 30, "#fde047", 12, 30);
            hitAll(m, 200, 200, 40);
            m.state = "p2";
            m.p2Combo = 0;
            m.p2T = 55;
          }
        }
        continue;
      }

      // ===== PHASE 1: Weapon Master =====
      // Cycle weapons every ~6 seconds
      if (--m.wt <= 0) {
        m.wt = 380;
        const weapons = ["greatsword", "curved", "spear", "staff"];
        let next = weapons[(R() * 4) | 0];
        while (next === m.weapon) next = weapons[(R() * 4) | 0];
        m.weapon = next;
        m.combo = 0;
        m.timer = 0;
        m.state = "normal";
        m.beamT = 0;
        m.thrustT = 0;
        m.spinT = 0;
        m.chargeT = 0;
        sfx.cinderCharge();
        addFx(m.x, m.y, "#f97316", 90, 16, "ring");
      }

      // --- STAFF: lightning orbs + beam ---
      if (m.weapon === "staff") {
        if (dist2 > 100000) moveTo(m, near, ms);
        else if (dist2 < 40000) {
          m.x -= Math.cos(a) * ms * 0.9;
          m.y -= Math.sin(a) * ms * 0.9;
          cl(m);
        }
        if (--m.homingCd <= 0) {
          m.homingCd = 160;
          sfx.cinderBeam();
          addFx(m.x, m.y, "#60a5fa", 110, 18, "nova");
          for (let i = 0; i < 8; i++) {
            const an = (i / 8) * CROSS + drawFrame * 0.05;
            B.push({
              x: m.x,
              y: m.y,
              vx: Math.cos(an) * 4.5,
              vy: Math.sin(an) * 4.5,
              dmg: 38,
              color: "#60a5fa",
              r: 7,
              homing: true,
              pierce: true,
              life: 140,
            });
          }
        }
        m.beamT++;
        if (m.beamT > 50 && m.beamT < 220) {
          const ba = Math.atan2(near.y - m.y, near.x - m.x);
          if (m.beamT % 8 === 0) beam(m.x, m.y, ba, 42, 5, "cinder");
        }
      }

      // --- SPEAR: proper thrust with wind-up + trail + impact ---
      else if (m.weapon === "spear") {
        if (m.state === "normal") {
          moveTo(m, near, ms * 1.05);
          if (dist2 < 70000 && m.timer <= 0) {
            // Wind-up
            m.state = "windup";
            m.ct = 18;
            sfx.cinderThrust();
            addFx(m.x, m.y, "#f97316", 80, 14, "ring");
            const ca = Math.atan2(near.y - m.y, near.x - m.x);
            m.cx = Math.cos(ca);
            m.cy = Math.sin(ca);
          }
          m.timer--;
        } else if (m.state === "windup") {
          // slight pull back
          m.x -= m.cx * 1.2;
          m.y -= m.cy * 1.2;
          cl(m);
          m.ct--;
          if (m.ct <= 0) {
            m.state = "thrust";
            m.ct = 22;
            sfx.cinderCharge();
            // visible charge line
            cinderSweep(m.x, m.y, Math.atan2(m.cy, m.cx), "#fb923c", 120, 14);
          }
        } else if (m.state === "thrust") {
          // strong forward thrust with trail
          if (m.ct % 2 === 0) {
            burst(m.x, m.y, 4, "#f97316", 5, 10);
            Pt.push({
              x: m.x,
              y: m.y,
              vx: -m.cx * 2,
              vy: -m.cy * 2,
              life: 14,
              c: "#fde047",
            });
          }
          m.x += m.cx * 13;
          m.y += m.cy * 13;
          cl(m);
          m.ct--;
          hitAll(m, 70, 165, 45);
          if (
            m.ct <= 0 ||
            m.x <= m.r + 3 ||
            m.x >= W - m.r - 3 ||
            m.y <= m.r + 3 ||
            m.y >= H - m.r - 3
          ) {
            // Impact
            sfx.cinderImpact();
            cinderSweep(m.x, m.y, Math.atan2(m.cy, m.cx), "#f97316", 150, 18);
            ring(m.x, m.y, 20, "#f97316", 130, 5);
            addFx(m.x, m.y, "#fb923c", 160, 22, "nova");
            burst(m.x, m.y, 22, "#fde047", 10, 24);
            hitAll(m, 130, 120, 25);
            m.state = "normal";
            m.timer = 40;
          }
        }
      }

      // --- GREATSWORD: heavy combos with clear swings ---
      else if (m.weapon === "greatsword") {
        moveTo(m, near, ms * 0.75);
        m.timer--;
        if (m.timer <= 0 && dist2 < 36000) {
          if (m.combo < 2) {
            cinderSweep(
              m.x,
              m.y,
              a + (m.combo === 0 ? -0.5 : 0.5),
              "#f97316",
              190,
              24,
            );
            hitAll(m, 190, 130, 38);
            m.combo++;
            m.timer = 48;
          } else {
            // Finisher: wide double slash + shockwave
            cinderSweep(m.x, m.y, a, "#fb923c", 230, 28);
            cinderSweep(m.x, m.y, a + Math.PI, "#f97316", 200, 24);
            ring(m.x, m.y, 24, "#f97316", 150, 6);
            hitAll(m, 230, 230, 55);
            m.combo = 0;
            m.timer = 70;
          }
        }
      }

      // --- CURVED SWORD: spinning dash with afterimages ---
      else if (m.weapon === "curved") {
        if (m.state === "normal") {
          moveTo(m, near, ms * 1.6);
          m.timer--;
          if (m.timer <= 0 && dist2 < 20000) {
            if (m.combo < 3) {
              cinderSweep(m.x, m.y, a, "#fde68a", 130, 14);
              hitAll(m, 120, 65, 12);
              m.combo++;
              m.timer = 11;
            } else {
              // Spin dash
              m.state = "spin";
              m.spinT = 26;
              sfx.cinderCharge();
              const ca = Math.atan2(near.y - m.y, near.x - m.x);
              m.cx = Math.cos(ca);
              m.cy = Math.sin(ca);
              addFx(m.x, m.y, "#fde68a", 90, 14, "ring");
            }
          }
        } else if (m.state === "spin") {
          // spinning dash with particles
          if (m.spinT % 2 === 0) {
            burst(m.x, m.y, 3, "#fde68a", 4, 10);
            cinderSweep(m.x, m.y, m.spinT * 0.55, "#fde68a", 110, 10);
          }
          m.x += m.cx * 11;
          m.y += m.cy * 11;
          cl(m);
          m.spinT--;
          hitAll(m, 100, 90, 20);
          if (m.spinT <= 0) {
            sfx.cinderSlash();
            ring(m.x, m.y, 16, "#fde68a", 100, 4);
            hitAll(m, 140, 110, 25);
            m.state = "normal";
            m.combo = 0;
            m.timer = 28;
          }
        }
      }
      continue;
    }

    if (m.type === "nagato") {
      if (m.gedoActive) {
        m.gedoT--;
        if (!B.some((b) => b.gedo && b.owner === m && !b.dead) || m.gedoT <= 0)
          resolveGedoOutcome(m);
        continue;
      }
      if (m.hp <= m.max * 0.9 && !m.animalDone) summonBeasts(m);
      if (m.hp <= m.max * 0.55 && !m.painDone) summonPains(m);
      m.devaCd--;
      m.pullCd--;
      m.ctCd--;
      m.asuraCd--;
      m.humanCd--;
      m.elemCd--;
      if (--m.timer <= 0 && dist2 < 22500) {
        heroMelee(m.x, m.y, a, "#dc2626", 150, 0.95, 18);
        hitAll(m, 140, m.dmg, 15);
        m.combo++;
        m.timer = m.combo % 3 === 0 ? 45 : 22;
        if (m.combo >= 3) m.combo = 0;
      }
      if (m.devaCd <= 0 && E.filter((e) => D2(e, m) < 44100).length >= 3) {
        m.devaCd = 320;
        sfx.deva();
        addFx(m.x, m.y, "#ef4444", 230, 34, "ring");
        addFx(m.x, m.y, "#fecaca", 150, 24, "ring");
        addFx(m.x, m.y, "#7f1d1d", 205, 28, "aura");
        burst(m.x, m.y, 48, "#ef4444", 12, 32);
        heroMeleeBurst(m.x, m.y, "#ef4444", 205, 26);
        heroMelee(m.x, m.y, 0, "#fecaca", 185, 1.55, 22);
        for (const e of E)
          if (D2(e, m) < 44100) {
            const aa = Math.atan2(e.y - m.y, e.x - m.x);
            e.x += Math.cos(aa) * 140;
            e.y += Math.sin(aa) * 140;
            cl(e);
            dmgE(e, 130, 10, m);
          }
      }
      if (m.pullCd <= 0 && dist2 < 115600) {
        m.pullCd = 360;
        sfx.deva();
        addFx(m.x, m.y, "#38bdf8", 185, 28, "ring");
        burst(m.x, m.y, 24, "#38bdf8", 8, 24);
        for (const e of E)
          if (D2(e, m) < 115600) {
            const aa = Math.atan2(m.y - e.y, m.x - e.x);
            e.x += Math.cos(aa) * 115;
            e.y += Math.sin(aa) * 115;
            cl(e);
            dmgE(e, 95, 0, m);
          }
      }
      if (m.ctCd <= 0 && m.hp <= m.max * 0.65) {
        m.ctCd = 620;
        addFx(m.x, m.y, "#7e22ce", 175, 30, "aura");
        sfx.dark();
        B.push({
          x: m.x,
          y: m.y,
          vx: Math.cos(a) * 6.5,
          vy: Math.sin(a) * 6.5,
          dmg: 240,
          color: "#111827",
          r: 16,
          chibaku: true,
          life: 190,
        });
      }
      if (m.asuraCd <= 0) {
        m.asuraCd = 280;
        addFx(m.x, m.y, "#f97316", 110, 24, "nova");
        for (let i = 0; i < 4; i++) {
          const aa = a + (i - 1.5) * 0.25;
          B.push({
            x: m.x,
            y: m.y,
            vx: Math.cos(aa) * 8,
            vy: Math.sin(aa) * 8,
            dmg: 85,
            color: "#f97316",
            r: 7,
            homing: true,
            life: 150,
            asuraMissile: true,
          });
        }
      }
      if (m.humanCd <= 0 && dist2 < 9025) {
        m.humanCd = 420;
        heroMelee(m.x, m.y, a, "#a855f7", 145, 0.9, 20);
        if (
          R() < 0.35 &&
          !near.isBoss &&
          !near.isMiniBoss &&
          M.filter((x) => x.type === "converted").length < 120
        ) {
          M.push({
            type: "converted",
            x: near.x,
            y: near.y,
            hp: 65 + wave * 5,
            max: 65 + wave * 5,
            sp: 2.2,
            r: 16,
            dmg: 1.4,
            emoji: "👹",
            color: "#a855f7",
          });
          near.hp = 0;
        } else dmgE(near, 175, 10, m);
      }
      if (m.elemCd <= 0) {
        m.elemCd = 320;
        addFx(m.x, m.y, "#ef4444", 230, 32, "nova");
        addFx(m.x, m.y, "#fde047", 165, 18, "flash");
        const elems = ["#ef4444", "#38bdf8", "#a16207", "#4ade80", "#fde047"];
        const el = elems[m.elemIdx % 5];
        m.elemIdx++;
        burst(m.x, m.y, 20, el, 10, 25);
        ring(m.x, m.y, 16, el, 170, 5);
        hitAll(m, 175, 145, 20);
      }
      moveTo(m, near, ms);
      continue;
    }

    if (m.type === "rennala") {
      m.comboCd--;
      m.stepCd--;
      m.volleyCd--;
      m.pulseCd--;
      if (!m.phase2 && m.hp < m.max * 0.5) {
        m.phase2 = true;
        sfx.lunar();
        burst(m.x, m.y, 35, "#93c5fd", 12, 35);
        ring(m.x, m.y, 22, "#e0e7ff", 200, 6);
        slash(m.x, m.y, 0, "#e0e7ff", 25);
      }
      const boost = m.phase2 ? 1.35 : 1;
      if (m.stepCd <= 0 && dist2 < 40000) {
        m.stepCd = m.phase2 ? 90 : 130;
        const aa = a + Math.PI + (R() - 0.5) * 1.2,
          sl = (m.phase2 ? 90 : 110) + R() * 40;
        m.x = near.x + Math.cos(aa) * sl;
        m.y = near.y + Math.sin(aa) * sl;
        cl(m);
        heroMelee(
          m.x,
          m.y,
          Math.atan2(near.y - m.y, near.x - m.x),
          "#93c5fd",
          130,
          0.8,
          16,
        );
      }
      if (m.pulseCd <= 0 && dist2 < 78400) {
        m.pulseCd = m.phase2 ? 250 : 340;
        addFx(m.x, m.y, "#93c5fd", 260, 34, "nova");
        const pr = m.phase2 ? 250 : 190;
        ring(m.x, m.y, 28, "#93c5fd", pr, 7);
        for (const e of E)
          if (D2(e, m) < pr * pr) {
            dmgE(e, m.dmg * 0.85 * boost, 18, m);
            e.slowT = Math.max(e.slowT || 0, m.phase2 ? 180 : 120);
          }
        for (const o of M)
          if (o !== m && o.hp > 0 && D2(o, m) < pr * pr * 0.49)
            o.hp = Math.min(o.max, o.hp + o.max * 0.03);
      }
      if (m.volleyCd <= 0 && dist2 > 32400 && dist2 < 176400) {
        m.volleyCd = m.phase2 ? 200 : 280;
        const count = m.phase2 ? 7 : 5;
        for (let i = 0; i < count; i++) {
          const a2 = a + (i - (count - 1) / 2) * 0.22;
          B.push({
            x: m.x,
            y: m.y,
            vx: Math.cos(a2) * 8.5,
            vy: Math.sin(a2) * 8.5,
            dmg: Math.round(55 * boost),
            color: "#93c5fd",
            r: 7,
            homing: true,
            life: 160,
            lunarBolt: true,
            magic: true,
          });
        }
      }
      if (dist2 < 32400) {
        if (m.comboCd <= 0) {
          m.combo = (m.combo || 0) + 1;
          if (m.combo % 3 === 0) {
            m.comboCd = m.phase2 ? 32 : 45;
            const fr = m.phase2 ? 195 : 160;
            heroMelee(m.x, m.y, a, "#e0e7ff", fr, 1.25, 26);
            heroMeleeBurst(m.x, m.y, "#93c5fd", fr, 20);
            for (const e of E)
              if (D2(e, m) < fr * fr) {
                dmgE(e, m.dmg * 1.6 * boost, 25, m);
                if (R() < 0.5) e.slowT = Math.max(e.slowT || 0, 120);
              }
          } else {
            m.comboCd = m.phase2 ? 18 : 26;
            heroMelee(m.x, m.y, a, "#93c5fd", 150, 0.95, 18);
            hitAll(m, 140, m.dmg * 0.65 * boost, 15);
          }
        }
        if (dist2 > 3600) moveTo(m, near, ms * (m.phase2 ? 1.3 : 1.05));
      } else moveTo(m, near, ms * (m.phase2 ? 1.2 : 1));
      continue;
    }
  }

  // Cleanup
  E = E.filter((e) => {
    if (e.hp > 0) return true;
    if (e.type === "pain") recordPainDeath(e);
    if (e.isBoss) {
      souls += 25;
      boss = null;
      sfx.boom();
      document.getElementById("bossName").style.display = "none";
      document.getElementById("bossBar").style.display = "none";
    } else if (e.isMiniBoss) {
      souls += 8;
      sfx.boom();
    } else {
      souls++;
      if (e.variant === "splitter") {
        for (let i = 0; i < 2; i++) {
          const s = makeEnemy(
            e.x + (R() - 0.5) * 30,
            e.y + (R() - 0.5) * 30,
            wave,
            "normal",
          );
          s.hp = s.max = s.max * 0.45;
          s.r = 12;
          E.push(s);
        }
      }
      if (
        M.some((m) => m.type === "deacons") &&
        M.filter((x) => x.type === "converted").length < 150 &&
        R() < dConv()
      )
        M.push({
          type: "converted",
          x: e.x,
          y: e.y,
          hp: 60 + wave * 5,
          max: 60 + wave * 5,
          sp: 2.2,
          r: 16,
          dmg: 1.2,
          emoji: "👹",
          color: "#f59e0b",
        });
    }
    return false;
  });
  M = M.filter((m) => {
    if (m.hp > 0) return true;
    if (m.type === "pain") recordPainDeath(m);
    return m.type === "nagato" && m.gedoActive;
  });
  if (M.length > 160) {
    const i = M.findIndex((x) => x.type === "converted");
    if (i >= 0) M.splice(i, 1);
  }
  Pt.forEach((p) => {
    p.x += p.vx;
    p.y += p.vy;
    p.life--;
  });
  Pt = Pt.filter((p) => p.life > 0);
  Fx.forEach((f) => f.life--);
  Fx = Fx.filter((f) => f.life > 0);
  Sl.forEach((s) => s.life--);
  Sl = Sl.filter((s) => s.life > 0);
  Bm.forEach((b) => b.life--);
  Bm = Bm.filter((b) => b.life > 0);
  if (!E.length) {
    sfx.clear();
    if (wave % 5 === 0 && wave % 10 !== 0)
      document.getElementById("bossName").style.display = "none";
    wave++;
    spawn(wave);
  }
  if (P.hp <= 0 && !window._dead) {
    window._dead = 1;
    sfx.gedo();
    alert("Died Wave " + wave + " Souls " + souls);
    location.reload();
  }
  document.getElementById("souls").textContent = souls;
  document.getElementById("hp").textContent = P.hp | 0;
  document.getElementById("wave").textContent = wave;
  document.getElementById("army").textContent = M.length;
  document.getElementById("deaconInfo").textContent =
    dHeal() + " HP/s | " + Math.round(dConv() * 100) + "% Convert";
  if (boss && boss.hp > 0)
    document.getElementById("bossFill").style.width =
      (boss.hp / boss.max) * 100 + "%";
}

const TPL = {
  HUM: [
    ".....KKKKKK.....",
    "....KMMMMMMK....",
    "...KMLMMMMMMK...",
    "...KMEEMMEEMK...",
    "...KMMMMMMMMK...",
    "....KKMMMMKK....",
    "..KKAAKKKKAAKK..",
    ".KMAAMMMMMMAAMK.",
    ".KMMAMMLLMMAMMK.",
    ".KMMKMMMMMMKMMK.",
    "..KKKMMDDMMKKK..",
    ".....KMMMMK.....",
    ".....KMKKMK.....",
    ".....KMKKMK.....",
    "....KKMKKMKK....",
    "....KKKKKKKK....",
  ],
  DEM: [
    ".KK..........KK.",
    ".KAK........KAK.",
    "..KAKKKKKKKKAK..",
    "..KMMMMMMMMMMK..",
    ".KMMLLMMMMMMMMK.",
    ".KMEEEMMMMEEEMK.",
    ".KMMEKMMMMKEMMK.",
    ".KMMMMMMMMMMMMK.",
    ".KMMKWWWWWWKMMK.",
    ".KMMMKWKWKWKMMMK",
    ".KDMMMKKKKKKMMDK",
    "..KDDMMMMMMMMDK.",
    "..KDDDMMMMMMDDK.",
    "...KKDDDDDDDDKK.",
    "....KKAKKKKAKK..",
    "....KKKK..KKKK..",
  ],
  BST: [
    "................",
    "..........K..K..",
    ".........KMKKMK.",
    "........KMMMMMMK",
    "..KKKKKKKMMEEMAK",
    ".KMMMMMMMMMMMMK.",
    ".KMLLMMMMMMMMWWK",
    "KMMLLMMMMMMMMMK.",
    "KMMMMMMMMMMMMK..",
    "KDMMMMMMMMMMDK..",
    ".KDDMMMMMMMDDK..",
    ".KMKKMK..KMKKMK.",
    ".KMK.KMK.KMK.KMK",
    ".KKK.KKK.KKK.KKK",
    "................",
    "................",
  ],
  DRG: [
    "K..............K",
    "KK....KKKK....KK",
    "KAK..KMMMMK..KAK",
    "KAAKKMMMMMMKKAAK",
    "KAAAKMEMMEMKAAAK",
    ".KAAKMMMMMMKAAK.",
    "..KKKMMWWMMKKK..",
    "....KMMMMMMK....",
    "...KMMLLLLMMK...",
    "..KMMMLLLLMMMK..",
    "..KMMMMMMMMMMK..",
    "..KDMMMMMMMMDK..",
    "...KDDMMMMDDK...",
    "...KKMMKKMMKK...",
    "...KMMK..KMMK...",
    "...KKKK..KKKK...",
  ],
  SKL: [
    "................",
    ".....KKKKKK.....",
    "...KKWWWWWWKK...",
    "..KWWWWWWWWWWK..",
    "..KWWWWWWWWWWK..",
    "..KWKKKWWKKKWK..",
    "..KWKEKWWKEKWK..",
    "..KWKKKWWKKKWK..",
    "..KWWWWKKWWWWK..",
    "...KWWWWWWWWK...",
    "....KWKWKWKWK...",
    "..KMMMKKKKKMMMK.",
    ".KMMMMMMMMMMMMK.",
    ".KDMMMMMMMMMMDK.",
    ".KDMDMDMMDMDMDK.",
    ".KKKKKKKKKKKKKK.",
  ],
  GLM: [
    "................",
    "...KKKKKKKKKK...",
    "..KMMMMMMMMMMK..",
    "..KMLLMMMMMMMK..",
    "..KMKEEKKEEKMK..",
    "..KMMMMMMMMMMK..",
    ".KKKMMKKKKMMKKK.",
    "KMMMKMMMMMMKMMMK",
    "KMLMKMMAAMMKMLMK",
    "KMMMKMMAAMMKMMMK",
    "KDMDKMMMMMMKDMDK",
    ".KKKKMMMMMMKKKK.",
    "...KMMMKKMMMK...",
    "...KMMMKKMMMK...",
    "..KMMMMKKMMMMK..",
    "..KKKKKKKKKKKK..",
  ],
  EYE: [
    "................",
    ".....KKKKKK.....",
    "...KKMMMMMMKK...",
    "..KMMMMMMMMMMK..",
    ".KMMMMKKKKMMMMK.",
    ".KMMMKWWWWKMMMK.",
    "KMMMKWWEEWWKMMMK",
    "KMMMKWEEEEWKMMMK",
    "KMMMKWWEEWWKMMMK",
    ".KMMMKWWWWKMMMK.",
    ".KMMMMKKKKMMMMK.",
    "..KMMMMMMMMMMK..",
    "...KKMMMMMMKK...",
    ".....KKKKKK.....",
    "................",
    "................",
  ],
};
const SC = {};
const shade = (h, f) => {
  const n = parseInt(h.slice(1), 16),
    c = (i) => Math.max(0, Math.min(255, Math.round(((n >> i) & 255) * f)));
  return "rgb(" + c(16) + "," + c(8) + "," + c(0) + ")";
};
function sprite(t, M, A, E) {
  const k = t + M + A + E;
  if (SC[k]) return SC[k];
  const cv = document.createElement("canvas");
  cv.width = cv.height = 16;
  const g = cv.getContext("2d"),
    pal = {
      K: "#0d0b14",
      M,
      D: shade(M, 0.6),
      L: shade(M, 1.4),
      A,
      E,
      W: "#f1f5f9",
    };
  TPL[t].forEach((row, y) => {
    for (let x = 0; x < 16; x++) {
      const p = pal[row[x]];
      if (p) {
        g.fillStyle = p;
        g.fillRect(x, y, 1, 1);
      }
    }
  });
  return (SC[k] = cv);
}
function drawSpr(o, s, r) {
  const dx = o.x - (o._lx === undefined ? o.x : o._lx);
  if (dx < -0.2) o._f = 1;
  else if (dx > 0.2) o._f = 0;
  o._lx = o.x;
  const sz = Math.max(16, Math.round((r * 2.8) / 16) * 16);
  ctx.save();
  ctx.translate(o.x, o.y);
  if (o._f) ctx.scale(-1, 1);
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(sprite(s[0], s[1], s[2], s[3]), -sz / 2, -sz / 2, sz, sz);
  ctx.restore();
}

// ============ NEW CUSTOM SPRITES ============
const SPRITE_B64 = {
  player:
    "data:image/png;base64,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",
  bearded:
    "data:image/png;base64,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",
  redblack:
    "data:image/png;base64,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",
  purplegold:
    "data:image/png;base64,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",
  redhood:
    "data:image/png;base64,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",
  darkhood:
    "data:image/png;base64,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",
  bluegirl:
    "data:image/png;base64,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",
  dragon:
    "data:image/png;base64,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",
};

const spriteImgs = {};
let spritesReady = false;
(function loadSprites() {
  const keys = Object.keys(SPRITE_B64);
  let loaded = 0;
  keys.forEach((k) => {
    const img = new Image();
    img.onload = () => {
      loaded++;
      if (loaded === keys.length) spritesReady = true;
    };
    img.src = SPRITE_B64[k];
    spriteImgs[k] = img;
  });
})();

const SPRITE2_B64 = {
  beast_bird:
    "data:image/png;base64,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",
  beast_dino:
    "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAGAAAABECAYAAAB+pTAYAAAnUUlEQVR42tW92Y9lV3bm91tr733OuffGkJEjySJrIGueutRdKqk1tGS7BXQbja4W0Gg33PCD/wvDfvGfYfjJT36x0YBtGIJhqKTWAEk1qoqsiSVWsVgck8mMyIyIe+85e++1/LBPREYmkyxOEsoXSDARGfcMe+81fd+3FuW//x/+RwBcAu1jACjOwz4mhhPA5Pz3FcAVEQGpgOEWqTjZjrl9+hN3zQRRRJTIkss7nxR1pbRvAyDU9iymiIT5WQwXCA88jojMT/rAz/3hz/2m97hwnXf6eafX9gvX9Pk7+ha/Gx/+WG191duyMC8wKGLeNgAHKSC13dAFm28sMlF9jURDOMXzIaKGi6D0lAqG4w6ifv6Q0O4ZY8JdcFcqGR7y4u5+fkTezSK+14+7I2/zb2fPISL4u7huvHeRev+LuOAiuAtijoie3yggbfEkUaxCEEQFFyOkQq6njNs7vj0diUNbZDSACIpSazvZiCIunN+2Oojyf/yf/9EXiyWnp6d89av/WkqtVNE3LbTee/j3t7DvcwPfz/fjBftqh93l/PXMHBFwFRwDMTDDyXiY3U/KmE+QJopt6Hazq59yd3ObqgMlQ0wDtVZEHEKh63s8rqlTIOkOOWe61LOZKiLG8fqY9XhCKaVtuCj5wiJ/ECf+okt4u5Pt51Yt73qj/R38fvzlO2vnG1RrJkbFfMKk4J5xJowMvnZjAwFEMpUthIhXcBdqdYYhYnWi2pocj0mxQ0zRIEy5oLEHYLQtEWcaC9M0ETX+/buXBzbV36NVeXMN7/j78YHo8aZwYVJQNUQN01OO85FLOkV0AjFqLZgZ4/oEUePa4jFyDs3HywgR3AM7ywVf+cqXgYntds3fPftDzzVTfIfQ7VMt8I2vP0s1+Ke/9wVWyyWLbgcTMA8ghrt9oFbwbhfcRR4aiO0Bq5K3iRdvuQHaNu78Ys38rLkNqSCVkCZSf4ymE2qt4JExO1YVykC2DTuLy9ytx4gEXPK5izYzXvrFqygTqTeuPqI4zisvvMLuXuLK1cf51t9uMAPtR47Xp+Q8cnDtcaSCOb8SnwcX297n9eJFXyf37XZlyieUeBvCoatmLB6h/THTZARbYjVxfBhJusJc8BrZ1QOmqozTS6SuQ8zpRPGy4afPP0eWwJXLezz14WukcMobXeEf/aMvUmqi5kKUHV766R1K3uD+Bj9/7g3vQiL4iq98+ctSa0GlpcE2B37BURfEIi5zrPqAFlreIuD6A//+Xl1WPLuoi88PfnahCeMU10NP/V1EC49cv0yXrnKwd4OPPPZRxq3xP/9P/xvLncA4nhKisp06losDlhrIgKkymRPEiKlCEW7fvIOfRI6PJ77+1y/ya1+8wY9/8qwou15yZNpOiA24O8dlotqWXkdKGVFV8NLMVcKFBXJEMvDu0sAPKrN5L0H67YOwGOO09cXKsJoJGlj2l1n2uwy6x7WDR9huJ2IQat4wrDq22y1P/+gZdoahuS4c14iZEETIOSMeUJRpK9x8Zc1icZ2vf/0ZeeEXP/WUErhhvmnZljuiHUGF3f0FEgXBseKEGBE3THSOXc1lOvo2ec2v3ufcAgSZD7/OpqWA0Q9KlQ4h8dyPTvjaH30NKca/+uqvU23L/qWBmHosOXHZ4f3IiaypvYMp6o4jTAZmQqLiOHtXl/Kl65/jW9/5gf/kp99318rqINKnyBe++GXM1rgJeI+jeN6TujG8BEQjmOAC6mF+jQK0euT9uIQPsj54Rxtg83lRVxA7AxYQAiLOdrumX0Y09JQS0bggRmd9OiGhMI4j1SGXjMbIVCesFNAery34xqBUzwQFzYWhW7Cpx+7RSMuW3YSUyDkzmaFxBNu0U20jhpCzeTYTZSDJPopgNntqtRk80XM44/83FnC+y2JAJcwYi4dK8UIZN9w+3fLyy4fYdJXrT1wjoaxHKNUIsodXASKehalCCoFigm6dcRr5L/6rP+DG9cjNp3/A83/+A0jON1+8jXcLVCOiQrZCCIqKoNKBRgJOVSOEynpzk6P1q550j93uIyK2IEps8cszqFL9zWmi/j3UDB/kteNFoKkVwRfPkWI1AANCT0gDfVKkGLkaNQN01GyQEubOlStXuHZtxd5qn2/8xbeIGrDsbO4cE8ZMd5wZWcMouCrWgaowhwzAEBGixwZhiM2F2h0kBWBDkVOCALLTvP1cxX8w4fcf2ALOfF0rMmYM1AWRAfIC0avEUKnbQgwDHowUjXEcUZQ3bm45OtwQwi59tyBtnQ9fXbIKHbEKlgW/27PdRuT0UX79809x885dnnn+BxxPI12nKAF3QUWICiIjojMMgSLSkXNFOwM9YZtfcrEd4BFJOiAWQZ0WbfRN6aT+ip5+EbmQBbm2HNp1dquBg9Uj0i1v8Pwvfurrm0axIzbr24id8olPPIEVx6eeZbfPv/gX/x4h8PT3vs4TH/okewfCH/43/4bT0zWbO5VbRz3/6//yp3TrwO7VXfSjHV2sqBbcYgP3DMwqQSoaZmjaA6gjrs1E1NDFFmqh5OQx7ovmS4AS3LEP2N2c5/3+wVmXX6gl4kWcH3GU2rIJAl1MUAs+Op1ETu/eIRDAF2hekseRvltQ68TxyU2JcQApbqXSpcjto1fIpVJzpUw7xFVkKk7uhEUK4I6KzI9yhv/7nOvP6KdWUEO0gs9VtY/AhOtx4zF0AWWYs89f3RT0wSIOIAZp2YSIIF6xGTo2c4KDVOfDj39MPvz4UwQSRMXLBCEjGjEiUgueC6VOPPr4k/LMT16A544J3akPIbG0PW7efFkevX7g46OQtWJWSKHDy5aUAnjAVEEyb5xuWR+vKaVgdUKlcoqiyUkhUGvDTTZ6i9Fvu9gbDP4RSXJAkAD1DECsLbZInPkjQ3HEWwp75p7kIeCZPkD6PJiSmvt7dkN+4bvxvt0xpZSMBIjSzdVlQILPrilQXQkaqQKIYFXopMdsLthij9WOyRKpdmLu/O23v+l48m7ZM/UZccMdvIKmiBngRlAwr6zXa8YCp6cTNk0MKaKrhHrFq6EeUUkQG/tW6iljOfbgg4gvCHMtIC4gtGc9C9a/YnE6FjNCCFQEEwihQcJeHJMAkjBRqhhQUA2IKU5EXInS4+7UsMVDRcuWXlYEEuM2cnj7Dd/eMTTepV+uiOKUWlEJBHHMO8aTTMT51Gc+TOUU7QoxRNYnW8q2Jw275O0pfZ9YrRbsrnYQSbz62utoFNAtHl7F+8nFr4hbDyWBJER0Pjx2ISwnBEHE3hI+eCvK84MK4mfW11zQlImayF5mhmo2UXGcBCYEjY1SrBUYUG2gV/UJx4lxRkxVkQLf/eY3HRvZ31vy5MeeIA0b6J1Dm8hHd3ARilc8BzbHJ1zaHRhCIQ1LanL6ruP1fIdpm7myd4laFGfk2t4+O8sVpcJR6NAYGSkQJ9Kw5uTw1GvpWOiHpCM0CFsfju2c1QwPup93UgG/G+zH3ubnsWwn+hDpzOn7nk2eOAuLDWLJBHfEhCrSfCgZo8ULVwhqjJtj+hhQTXSDs1nfpuuFbjmgi4JLQQhEiVAB1fZdF/oUUIXTzZrOAnkt3D45YnO6JUoFX6NS0SAENVQhaSAGbQtsTrFKDhnXOpNCFdEA8yFvGc27R0M/KFT1LV3Q97/xbX/5Zz9n2a/4rT/4PVns72MeUVXMC6JbxDIiAaWjOigZ955anX6vcvXAXY9Oeem5l/j5S066suKzX/o4w75LZvJaM50fEF1Z39kQp4HJBTrDx8zJ3Tv03SVYdFhyfvTMzyk58NSTT/D5z91gnE7xuEPXNbXE7VunuCWmskEDqEZOT0Y0VDyMqApuRjVrcQB5YCnsbUPBGav1DwNFmBNEKaU0EsUFxxvhEmegTmOjFV3xCFYrVh2iYrZltYzcGBY8efmT/I0ccidFkMxWNl49E/sEUy9Pf+cHvj4dyVY5ePQqiFBHZ3e1R9cvGKtRxJiq0YcWW3LZIGpoShSp9P3AX/7NX7BIOzz+xDXcK2U+5dkq4hXeFg/SX60gnFJib/+Aj3/ys3z3u0/7l3/rK0KAENsJqKaYJ5CAh0CxDdEzKZ4w2UivuJaehb5ODJVPf/wSX385SFF8lC0eBqYy0NseZVxSTgoaI/thn9QpqYsUydA7x3cmim/b6QyVzXTCyXZAglLyyHJ3IHqH6D5TjqhGpjwyTZXqjZxxjwTvZu1Gg+js7PTPggP/BywV9Je4ofjZL31RIpGkiW9+91uu4hCgeEZVCdZTHJxCGU9Ji0TZHvEbv/O4V1lzvD5C8jElj2DGcq8nHXZ4dkmy8KO7d/nJM89ht7MvCIhDRNlZ7rJYdnQS0YXItm79ez/5Hq6Z3csrlsuOqW559rkXqN7EWWaVvb0DujRAhWEYWK4SxYTjF2/i1uAUPJxX9BfPvKPYXAu8XcFmH3A5p28TF2IeImJw8/kXPI7Oz5593j/1pc/IdrxDIhFIdOkuqx2jS6+5m3Dqr7KXQMR57eYR22OIw5LlYuAwd2jqubwSzJbynT/7nk9HRodgsbm1bSnEYUUMUbDsvnXvdJBu3PVMJZjT7yiugbF0uFdCqcQgrO+WBhVqZblITJMhJnRhAO8RIuID7vpAwicXlqN+ICnlB7FJMaoiJpxsM/v7l/j8pz4nZVvpbcCLUMMxcMi1g6uutSN2A8sP3eDvnjvi6M6aKV+RUjoOjwU3yA5FKyfubHPmsesf53Q4ZTX0HN2+xd07h8QY6IZeJnf6ECQhqAbyZkO32xi026+vUYmkrgm7LDiLxYqrVw7Y+VgkkOmSs4g9cbHPz189YjtVuiGSfQv10PuwFDeBUJsz8jS/dr1PPvgg7iPv4VS/O0zCz/1gFIeK8+jjH5Kr+wd+dOt1Kg6pY7Fakr0iQfnZ869Ix9rRE5AEshCru0xlgNBTtcPFEYweR6Qn9bt85jPXpOs6Is4rL7zof/5nX5vfIDD0HeP60H/23POIOcMistgZqDpiFnCEMhaMymqnw+qIUtlZDMQQUCrbKVNrBilYUV5/44hanatdYndHCUGos9GfyS3frXzwgxciyQU+QAXciJciw86efO8//Y0f3rzFYrXDb/ze74kvBqxGijpFEalOkDjLUhRUcASROc9uUjrcrOXgwOl6Q6fKNheQRHEBSYQ44LKS08l96CLdEInJmp/22GAQU5DA0Au7O5HFIHRDAq+IJ/qhZ5MrwhYk0/fOZj2RUmjVbHWYhV1hrn7FQeV+Xyz/QGlni02x6Wqxe3yAecsVjo6OCCGwWPT0S2WUQgiRYoZ52yxBUU2IBIqXcyKlIV9N89kAvoBZe7mxZLq+Z7W3y2KxIMUFQmL34Dr/+Nd/S1ZD4Jln/synsqbVT0qj4FtOvlzuUH3k1Vu3eO31m5h5k6ZU8BApRsOssLY5WpvelbkOmIl7cT+/5vsJqP6+grKdI7/xvCwxSLFnXSYWsaPfW1DVESm4WVN7ScC1NBV0VdwqUQLutWlHHVzbI4YQCJowgeyFmDr2Lu3L7/yz36Xve5CIS6BYJARnWzMVJwbBztyEgFMRhW5IhC5ycnKX0/UGN0F9iZtgOKpLDEN8iwiEWDC9i2oCa/e7t2rhfAn9l2hOP/CqQQzI965/JqlWjbg7n/7sZ0jLAQOO7xxT1hPuToxxfsiA1TMptrdTpn4uzcalWYi038+lEEJo1ak6i8UCd8cqmEHQiGrXuGFz1GeBwJzBVJkw2dIlJaijYpQyMuUtteYmKvNmDepKlESUgMYKaYIwNTGx1w8Eaji/33v3QReEY0o0a66n2AQaufrEI1Jw39y6y3f//Jteg/Cb/+XvS/ZCFqdngbhTabodFSilogiqStSO4tZkjlZIUTExrI48871v+89/9jwiwh/+2/8gtc5chAtOwAqkEFEHUyf7ltUlWKwGrl1eEJPz6PVdKk7Qjqe//Sy1Vqy2gI0ZmQ6xyvHJGxyXE/cqRL/ElYPHJSJUKkL3UB9yUed/9nf/e4sDAbxrshTm2FnqyOnm1C9du8Tf/eAHJBfSELh99JLvXb8s5hPrfIo5hBQpxagsCaqoJ9yYO2QqPmcdmPHySy/5ozcO5PD26ywXHe5zhSravLz7DJi1F7dimFTSQvjir32GoUtQMhqU0+0GF8HqBtcWAyq1wc4oZeu8fvOI/Y/foMqIBEcZWO4blA3TtKXmBYHlvcr4AQ3Q+6Uf347GNASzM++xvUfI9KFlHd/+2++yu1qxsQnpAsv9nh//3dPs3TnwicJ2uyYueiQkgnY8dvVJ9pcH4lWwUmkIRgUC7k4Igb/+679mSNUPdlfkmgmpcQ6qeh4QXWaWyUFUCdEYc+blF1/Ba2GxWLCzt+L5F37ByfEGkcCQVq1K1ohpy76madssqComEGNApXDr6EXfnhpmxrXLnxDPlTA/YxODvJUQ650HaxO/IJOcE4iHGkBGY5MBRYAgAsUZs7OzusK43VAFtqEidkLMiVuvv0HplWEvEi+BJgcyP/7F05wcjv6Vz/yWXN47QKWCO8UKaW7MWHQ9vWa8Gp0KJZfzE1JwokYMbe7Ea+OEzVksBnx0Ih2bky27O5cJvmKIixaLcp15Zceo5y+OSSP6xSizqvtke4KG5oKIjyG1Bwu/NA09W9N3ix+9tRUVpL9DXEwuFy3ARUkpstmsqTkTY8S1YtKIdCuZ0/XEE1du0Pc9WTIpduxe6nj95UMw83EcpU+CiaMxgsLQ9QhGSolSMkG16UTHiVxG0mKJx4yQyXFkVINqbG1CHZbLR0ihQ4KCJ5RIzRMqECRiXnGps1RRWPRLljvjfPojpZSG9DpIsFlPunWVes4Ki5ylqHKujbpYM4m/UxGvz5KeCxyz1PvyKdeC67G7r6m+Qf67sy5JF4I4XgpRlD/5kz/2bd7SDT13T44Zx5H1eMzHPv0h2CmsfQsuDHaJWy8c0o0rPvOpz/KZL3xKjk5v88d/9jUXj/QxEbwQpNDHgNUJCQErPULit/+z/1x0Zw3xhOPty94OfyHFFhuCDtSceOb7z7JY9KRuVmuYoEpLfymYR/CI0wj/YRWpVFIQtMYZ2R1xzTz6+MfQ7VWp20TiaqsNar3nbmZO2WbIQO870X7uy5v3YE4ilEpzaxdxUJctJoaQQJqS48YTJz4sK06+0KChilshxY5qBXenCx19iFzfO0BEODzsqLdHNuuJ/cev4gab25m6qZhVXnvtFT7/xU9z5+i2jydbLu0doAK1ZDRVdq/scPngBtWNxbAHHtjZL5gaJsGTLogxkMuGabPFzLl58zWO726wrCwOBlbLnlrH8zZad2uAcx2btNKtFWQGKgsoYKG2k48TQ6ALJ2ROvYoi8Uhq7pFuCR6BQKgDAUVn9bXNorGLMUHdcJW5mbFtSfAAUmeJTznPeNTB5DXgmGqjT+MKt54Qdu9tQHUjScSsmUzXDeRpS5kqq25AEQaPxKLk4mhNuMz0tiuqynq9ZpomxvWmSVq80qeByTMSHNFINUdC4PDoiJyNzWbjOjS0IPsJ/ZDYbI4xz2eRjeVyyXq9ZeiVJz/6CPuXlg3r1/mU0Q4MHog0F3D3eMP3f/gi2Q2hNQgKASwjtuHgcmTv4BKvvvKGHx8HVC+DDyLWgy1apucNbzJplbn6DHfP+yB+3iXNRV1562A0nIqGiSATH/5I592wQGTJ67c2nBwp08blPgswp0k6vDFkeaoEB1Ujb7ZwmtHckU8ylz9xjZgS67zhbjgBg1orISX6tERN24kwxwxSWnB454TXbt8mxsi4nVACt9JdQmhkys5Bx5WrEctK0BW11vZSZkTJ3H79BbaPL1nl08Yva0M3Reu9TpWQMBdS58QAYkqRJoMpeaKLzoeuP0KIRr/oeOzxygu/eJXKEcLg4kt0m8XzAGUHmxvFcZ0jxrxkNs6qbCDYbI2AjKhnJJ6ikt3kLqJrDq4fkOtd8FaZ1+1Syubg/gaNhgk5tRSu3XiEk7t3sO1EGSfGzZb91Q4lG6t+lxsHN9AUpaTs3//2D0hh4Phk3SrcCkJksxlnMsUJKbbHD+0+qYvUYhiVLg2YVGJsJzqGxLR1agktKbDM5es7DItE36cmsAqCWXmTOqHioEq2ci70FW/8NmL0fU9KPbffuEspGy5fHxhCoIZMqTO3Ge46VqTWWX0ttXXluM4vZ+DbuZM9YrOMMnhC9LiJCPTYQzRWfSWkZh9dt0ctETeYxgbt3NsAq+fURUiRz3zus4I5PcL3vvEtP3zjiOXugt2dJR994jFWuZcQOsL+vvzX//4/UOdKuAIf+egn5KMf/njrklHnP/5f/7sPZa6eqbOcpeLqXLtxjX4ZKHVL31emfMwQdvj5T16l5jPoeOSpTzzJ9UcTqmcwSKBYS6EdadhTiPzpX38b7XoWoZ8bOSri82gFn0hdR6nKT398hFvgYPUYTz52GQ0naEhUF37y3Mt4Wrj1W6w0J5NrJkTl0v4+tY4MXaZUWG8CpVbG3PRGIb7KE0/scrBqwoaYlFIj3/rWTdbjErfIKl6TICuqTPdbwJuAJxVKdTQEPCrbkll0PQc7+/hU2WxPfP/aNakCKSaKG26GuRM1NB84d9uX3CTkJgkRR62cu75p2iKam8sRyFOd+VxtNUUpWC6oDqSUyLUwyyFQDdRacRKlKiIrYlic611NwKrRp47jqU0DKKZUn+i7JWJKdLApYp4IUQhUsp0SOkGphKhEMsUmhh0odcuiN2ruuHt3xLWnS9ClitWRqCv6tNssVRvMUkok6jUJccByQuhxn+6loQ/jSUVadZtEwJxL/ZI//r//H08THJ+eMNbCJ37z1/jop56S0WsD7SRS3M6LkZQCx8fHlFJIKc1DOO4F0OzHvHrrBTefyNMRt2+9QVmDl56kiUcfu8ruwYLFgXC8eZ3d3QVnGuigcXabTaWRwsBzz79C3/ct6AdFpaWztVZK3rBaRC4fXENyZRq3fOmzn2B3J5FEef21W6y3pzz1uY82XhynbpsbO1wf8vwLf8eNG4+ys7Pko49f4fnnjvj+d19jWF3l05/9CKvVHaiRPi64c7im2kjmDhqFk9MrvPryntTctQLQEyH4AzHgQmt+k2sakgJ5bgO9m7dUcTjZIKeVoQucHt5pbktslt+UVjRppJQRqjMsB6wYUfUeWT4HxmT7PHHlk3J8cuhPP3uTaeqJGug04JZ59bUXePWW8+l//CTHpxs0tlw/ho7KGhHQYFhWagosgVgrpMBIwIPjtYBE6rSihoHNNvLhRy8zdE7oK7kKIexydHjahF5TD1JJQelmyXvyJeSew9cnpo3yoatCHyI2jYTFhoUUujIS05Kc4WQ8xUMh24RUYbM9huky1CUxNaCy2ni/17lYbjeIWlsFKYKrtHkNMXBSJ2pwNmWi62L7HXOodm41Xpu5n8HYISp1bgLwC7CBSCBIYm/nQKaxkkJPlECtjQDK1dluJ6ZpIucR88IwJC4drDCrOI14URUQa7ogKy01th6vXRP/BqFkuPnyXV549kWSJAKBaZogRPJ8v9QtWJ9mhA7LUF1QiUTt6OOCRESKULawSAt2lz27y8S4PaHkBr8XyxArGh3te2Jasj5pDe1hhlwQRwNEvYDSidzrL5GHgOcSlK/8/u9JCIH91dKf/dGPWfWDfO8vvuGHh4csD/b5/G//E1EzZC7BqxXOuo8k6Dyipt3FzJAQCWpEnKAKtTSCSLQFT0/ExLn6YdElvvCFj9L3icNvvHZ+asQrUowr125Qp8JLrxzzys0NxQtPfXEPaiF64tbrxwxmfOdPn6ZbCovdwCc/+xQHB/s89pEncBNqFQ5vn6CpgIQGVwCffOKTM/UqbO4IQTr+yZe+ANUwMUZTfvj0DwgpsXNpl9h3rDdgeaCMVwRNVG8wSmOb+ottqu8U8YNaC9s8yWaz8Vs/f8Vjht4jfYhkt/MU86zhT+eru90bZBHOINtaMAoxtLE4MTZB7RkrJqrnwqquG+jTQB+XxBDajCKDEBJCxC1xelyw7EyjoES8FJIvcMskVcQCkcTRaxt2Li0YxzVlY8glx6w0cbE7UR3HCJJaqltD41JEkRgo1XBVVNsIHpemWc2TAEvuvBFxFbbbRM0inXSz8tDuczvR34VCwKVJRCQGNnki58z28IQd6fExc+3S1ZZllDLPFDrTzsgZ/YaZoark3IRf3/zG33ie1kQFJaCSKLa9B16J03URs9IGRtQm7IozlGyAuTGQuH3zmOd+cKstcuhJaZeUOm797JiT0zvE0hNroIsLrl/dYbmr6LLw2iuv8NqtRhT1acCrsL+/T62tl6E1nYcmRjAgNHiCublQxTF3RlOiPCl17MjWN1lNGEjaGlAwI83Z4Zu6JN+NosJxlnNGo6psxpHUNQlhEJ0HPM2c7gOc64N/Xnv1RZZDN7sRvae2kFZUmWUWXcTMWiZTSqu4ayP+PTQhbsuuhKSLuS9AmDZbRJw65faqtWFEOWdCWlIsU6eR0zzicYZgwkjNRt+tQLxV2eJ4qQgVs3m8myrm5z1TlCoU3aNLu+QsxG4HdyFPzROE4EhoYrYLQ1/uqSJ+WZPaRTat5ImtV578+FMiH34SRufP/vw/+fHphle+/Yw/euMq+zeuiqvct/hlboUqZsTYpC3DKiFuDXUUxV1AA9VsNvnAzv4erkKMPaodbgmkaUOF1iNvBepWkNxkiU6lC966L0tqp86NIN6UHP2Kohl0iWjjCaK2ASDbzW2cHmyLeWgLd8bjixC0CZanEW6+9gbrkw27u9e4/uGPy7TtSSlR6wYNZ3w7YBkkzIOr7jmhFoRnU/5ltFyddztpoJamIZVVx6acUkrh1suvMkbjYx95QmoxtJu1OcisF7rAuYpwul3jbkic09Pa1NnmpaGzYnOvWmLaGl0c+MWLt/j5z39G8cKNJx6luhFDYOiXTOUOVXJLTVVxNagVt4h4bBmYNGznhz96qU0Ck7neEVqVrcb1SwPP/+QOoZ4yIlSzBqN7xtsgPSqJGzeeYhwvt1E64TLjWFtOYBm0MXxhPlSCNoT2gXGI8Z0wOw82sbUhGmddNDCOow8h4blw7dEbdIuB0HeMeSKENrxJpMEFTnMlAvNpuBcrWkopqBhCwOZNsQL9omcaN5Ra2b90wMm6zSRSUVJoftWlUGQiOJjp3GjXej515ozPJjFquqcVvc9d5orYgmANyk4aUDeqbXBy8/dBEOlZ7d2Q3YOBqLu4QKUg96WNNiOj3PvvA5qM+CbJxdvQawot+OC4OCYgtCBVcsZq5fFHHxeVDq/Np3ttqIHVip11qdRWoluevG2wgkNKAUXIpaBmRAmILCinTh5P2ZQTrtzYp2ph78o+J+sN/bIn9oErV/a49qEbvPrCESo9uUTEmrLub//qG21jbe5/Y3ueGIS591XEmaxZ3tHhXY5u3yHWSgiCBtjZ7QlBkBgJGqiaiP2AS0dxbbM1zlprz1puvTFizWjiOZXDu7GAtyDimvhpvmAITSRk7pSpeDk6kbBMhKEBUiogsz9MKc6bWhmGQUTEmxW04XwhBGLTpZzD4tu7IxYncihQQTSyGSdiN7A+3bLoEhacYdFx6cYueaywVtlZHOBmbMrGo0eiNYRJ1HCdhWYzp+zOuX4p1wqloiHOAgNBQiCENppTaQtu1lxaCErJlaBn0yfDnDI+2Kv/5mFS8Uyo+8saCc7xuXmqyjlZ7Ua3SMj+QB97nv3hjzg+OvKph9//l/9czjCfFAJ/9Ed/5LmMTNPEYtFTSmG1TM0imiujC5FqGbEWZEPoUQxxpVQ4PTb2lgNDtyJPBVCO7o5s/TU03KaUidPTDZ0e+O7+FYkeWW9PSdITrY3M1JBbUSiBPiWSRiS0rKa4E1JHlYnJpfnwELCwYhIhEkATUlshpZ5ax3sQmEe0tVin3IPX5AI/bFygYYgX4Qd9R4WYEZxz5rOo4H3iN/7gn4mY850//kunGj4ZGqV1XipYyVhtZL+IE6MSQ0DcyXZGmMDVRz7E5z7/RTmPOzrHiLm5WxX+5M+/5hKgyoTGhteHrpl9SZUQEgdDIlwz1Hv+3b/9b6XJ0y8cMrO3VDGIXFRD2My2tV5pfyCRaC6n6WOdh/h5D80GpMwbEd6/C2qZzb0HDuGsShSyGx4ViQ0TGhYD1StT2TCVkUg8zzxAyNVaq+k24xLYTuP8wC1zavVCWy9BcDdKljZXQpo4TGJgGgtdF9HQAu64ndpzWmlTWebhs3kqJA1vOdjpvEfgvIbR9vemvbsnupqD+/uWit6Do99526VIG0FW3TGclBLkORBvJqb16Ijw9b/5KyTAP/3d35Tv/egZv3N81OZluROledLPfv4LXD64KtmcFLtz/amqPnTjWzOhtxE2ZSQEoXghxGYpf/FX/68vdjqGtOLalRvE2BHDgBCxDFcProsXaezbfLrP3unNIykf1kcsD12P99rQ8Z4notYLpjhNE712pJQIXc+wXEmfOqbt6EMX+fpf/pWnvUWbhBvaC1VzzOHS5auisWMVIyWfdbK8WbEcY5xxn4bZWHWCNnIniRDmAX7TtpBiZD1u+NHrP0JCC5jurUr+zV/fpw+L+R5+n+A2vJU4676fy5t0pO+rRek9df3NvnnOotuAp9JMPkvrSilWUXMSkUETY62E0PoJ6pSJXUfqB0ox+iFRzdAYsOIPnP7mS6dpO09nd0TnQstr05l6g81DFLZHIzY6/c7AsFq25sJZrRel4GE6l5/YAwtpbzqt8kvHDfA+Z8u96w0Qp/nPc52SnW+EzXi/SWi9AzHO+tDItD1pXSmzLPGr//oPpTpsxjaAQ84IIHlgdP4cW9qIrDPdJYjV83E37XmcPBZ+93d+n9XeSp574Wf+i1d+hqhxcP0SpWQWIeKMmCsqyzmdloe62QcHs+pDrEHegTTxl23OewvCDwYufzAoGa/fvu3Z2wQVv3vK/tVL3Dk9YtCu4eTrNS6Kks6rYX/A955rM1uR0ERQyFzYNCgYHDMjSCDFxPVrj4km5caVDS+++ALb7ZYhRhY7S5RAlILMCgnOR15+MFMS/S3G7J9H9Q9iAx4mUr0/lW0p26WDffnqv/tD1CI//O73/fVXXiZMQhWnX3QXipWHDbqWN11b6r1pjvcyyZbZqIRmfbT/R0HNzv7uVfnUxz7nxyeH/OInP6brI1f2LvGdF2778Rsb/vm//Kqo0xr4/OFj8f18oNQ7a8J+L9O13nUHjr1DNxWSMtbCOo8c3T1m2ma0zoVMtfNh0O9Hi98IGz+Xupx9cs4MqedTT35afvsrvyPrO1vWRxu268y0zuRNua+R++26X95LR8x9bkrkbS3rPbmgh/nIs0MU5skkubQegZAiy70dbr/8CkJBqjP6BjE5x6fsPPNpQzXudwfzDLs3zYP286LTLryfVSNoxCqN7/VEqInokUVYoUMgpzjDCDNJdKFv98GF9AdG2vwyN/Vus6P/DzB2ydQ83sbVAAAAAElFTkSuQmCC",
  beast_dog:
    "data:image/png;base64,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",
  beast_panda1:
    "data:image/png;base64,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",
  beast_panda2:
    "data:image/png;base64,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",
  beast_rhino:
    "data:image/png;base64,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",
  beast_trex:
    "data:image/png;base64,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",
  boss_black:
    "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEsAAABQCAYAAABRX4iyAAAdG0lEQVR42s18+49kx3Xed05V3dvT89pdcjnLx1ICradN26RIPRxZ4Ua2/BAJQbItyXB+SODkn4iNAPkTAgOJDQRxAv1ghIqRxy+OTcfgQ5YNwySjB02JEi1wSWpJ7S53Z2d7uvveqjonP1TV7Xt7emZnlysnDSxmZrv7Pk6dOuc73/nOpd/53X+DH+eLiKCqAABVxeT6HM8//6LGGPELv/AYKQKY+bBv37brkHwtq16crw0ASAGlxbX3X/Z2G6ectH8yVQURgcliNpvpxYsXoapwroYP8v/UUMvXfNT/28MOXix+1PuqClZGFA9mxuJ6CCICgsGL/+dv1TmH4IHgFSKA4Qoxesx9CyKAy6oSQXVxY0QEKCdjsx56Uzd6GSLIUQvc834+Yo3su91iIgHGGBARjDFo2zb7MQPE2J80sDYiBAFTen9rawP70wksAaIKEEDEnYFVkY0jaWmIbtnTjvKolZ87YkHsyi/dxAoaY6CqiEERvIdzFUSAp59+WmNUbG5sQUTgLCAiOHXyBD7+8Y/SbDYDNMIyp1VXBoHwve+9qqdOncDpu+4g6e5TwfrjM9RxX/xuT0JEnVcBSB7EjBjTtokxbT3VtDVVFZPJBMZS9kzNPwUhBLz55pt47bXXFlsRDBX8f/GyR67KMTwsiGAymeCNN97SkavQtgExCKAEyluH2SJGD2st5vM53n77bWVmrK+vo6oqWt+oUVU1mqaBCDCbebSNwEsEs4KZwUygY7rXrXoU5UR0WGy07/YkRIQYVd947Q0YtiBK29IY2zumwFoLlYAYBa+++gOIKEIIgLL+o089Spub3I+4eO7Zr2tQyd9n/OKnP0nUy6y3y1CD7H1EZjwq4d3cCYOCyeTDMYgMSBNmYRAYlH5nRlVVCCFChdDMPUJsUY9cghbMsNbCe4/5fA6GAhLBmravquase3ti0c1mV/tuXZcBhFCAZTJKCsmKGCN2r11JfwshxghVxZ2nT+FnH3qI6lGCEGQVEYooCiXC5tY6zv2TT5Ex6TtVbRFjvOWbXL7euPR9fjcB/mZXptxIMhQvgj4vPiciXYAHAGIARsBuuFjlu6oRxgKGFaFtu1hS/t3q4r4bQ9tloLn64BmBs4GPi9JFlXHp4jv6xusX0ucIAALYGEQfARB8G7E/m8I5gyce/yyF0IItYTSy8DGCmWE0AiFCmgBWwv5sjr/+mxfUkKbtDCBKyrJKyaAhtHjsscdIRACNEKT35Rh4jA8B2Ye9r3lhbD8T6NJqlVVeGEfh2HSwQFXx0rf/Lhs0gUqAQRrzDQXszybJKyAYjR0Ui5hjyHTANniPqArnXAr8IgisgDJYCYR8XkqL1zQRQgyRAOsMIIDk/HuY56nqSlPyDRxmdTbslR0AEMvXldJeD4q6dvjzP39KJ5MJnHNwtoIxDt572LynEr7y2NzcxM/9/MdJNeq1a1ehiLDWdrHLWgfvI577y7/SjbUNAAzDDBiT0TtDCBAmGAGYKCF+AHVd45lnntH19TV89KOPkBDAxQsPgwXH8Dg5ZHcR0WqcVd5crA4BkoBnaCN2r+xCVRHaAFoz8BpQVaMufjEng1+5ehnb2+uAAd15+kQHPNMRDWIbUVkLeILnCFKFMQYcFcoMEQUDIDbJUCJgynGPCIYNmqZBjMmTVQhk8k33YhPfZAI4zCZ8VCDsB8OCvEMIebsNP9s0TWeI8tM5l26euQvuJVCXv0UEoQ1gmM7rhJLRY4zpc1EGgT0BZoLEdHuq1NE8y9f9D4LgE/JOpQazhYriq1/9Y11fW091HDOIGNPpFHEQ9NMmiOKxvj7ONyYw1qLNWc2ww3PP/aXu7V6HMQYiBlevXMO8bSDwg3VmZmgE7r57JxtEumujDFGMcQjBwyB5F0hvD4Bc5XWHpWENgspUICGMxxu5Tltsz+JhRGU1E+IO4mEri/3ZpPMyEcGoHqNyYxAZOFPBWgfLFsY4tBLgYwtiKRikQ++REgsBWkAPaGLpLFk0c4/5LGA6necgblZ7lzJupcws3myVaGXgU1VYU+GVV17Rr3/9r2G4QlVVAFNiYKjUj8ULUzZSjfj13/g1EglgzsE+AG+9dUFffPEbGI3G0ChgNqhsDRKFMhDbGSpS3HvyJJgIV69chwcjakQQD8kBur9QKoQgAX/1ta9rjBGz+RSf//znKEYPGIYUL1Q6ABX4JrFZF+AFKdP0QRvBYK0eYz71IOVulQ/zREHyLNEIY1IwBqXsRMpoGp+2FRkoExgGIQQYEJgJTiJMbLBxzWPNOMyvvoOqXkNjHJqcJfuglpEIvRA0lVckXbkUEQd5TQ7BVjdrMMvo08ALAm5vb4Lnn/+GvvLd78FYB2urlI2Ys2cwJMaMrxQiAcSKhz/yMEQkxSINABGIGSEI5rMGfh4X9R1JAp1sYY3BuPX4jYd+Cs4ofrh3EjI6hT97/u9wzQskKEIURHgYY2CUQMQAE0KMHcUZYwSiJPKQloAnybEMVGho7mXBA9BBB/Su4u9f/QHquu5AaGIYIiynDDefzxGjZi5LABVsb2/nYrkFwSTj0wIk9rNWCs+AD4oNATatxQ63MLM9bK/ViDt34U9nL2LqLX5w/jXEfEzNEGPnvjMJKBMDAoQMctO5FoSh3EKMUlXoYdmwj3o1I+mmaVBVFZhtFyeYuctq6TvJq5BX7k//15/hPe+9X6vKYjQa4ZFHHiYiBXPa6tbaA3SKVQKZMSZi8N9euwLTBPh2ivfUih96B7DDzrrDuN7GD9+6BjUWygxEgC0hAlBmkKGVTQ++SUNJgShLtaRdjvgJ3OWAZm1X1PYLZB+aQbbqDC4EZyq8fv4NqCpa3+DRRx/tsNDCc82A66oN4cqkASD42o8mcC2jmc3wzKWn0Sjgmn089uEHIcbi0qW/hXCEKqOyCk8KqIFRSUbTmBfxxsXzYSVRV/4tbU3bX4UCBdjkDGcI3nuMRiPM5/OMZwKqqupqv1TI8sB9LTuICMYjg6985SuatqJB7Wo4W6OqTGe8pmkxjR4hBrBGPPyes1iftIAjNOqBoAhtgzNNgFjBrz/0IEJUtIFwYTZFc2oT26d3QD4ikqBpGrDJdPQtglNetS2Xt+HwZ+waEt77jmNP3nV8GkR14X0FkZeCez6fYzKZwFoGW4IDcHptDafEwrOA19YBrzAMjBpBFEU7n8NGRcUVnA8Yn9jCXWfuIgOCICZv6OOx2wtKE2jqb0MAsI7xxBOfpUce/QhApTyJHbhTKeXGURw+Zy6ewR0rMWQziAhsE1MaWw/rBZg3cD6gvXodmM7Q7u1jPvUIc4VIomGMrTAeb8ASw4tHiwJqjy53lu/zlsudfjZ0zqGuLDY31xMeYts1QQdZ84Zt+5z9BF02LYYfjSqMxjUkEILMAAbemE6wHudo5hHTmBhUrwTVa5jM5rg8nQLGYh4ibG3xmQ/cD0ep9BJjciHPQ9lAMUzmx265NlxehUWWSyc4cWKLtrc3NUbFdH+W4aDpk7RHol4SXcmEFi8TEUgQOFcBpsI33roEDgJjHK43DVoERAUe+MkHUEeBf+nvQZIWbe5b1OM1Yga8CgwMiOWgkX5chfQg3iCgHjl87nNPEJHBH/3Rf1EVhZTtyASCXVnpa3LBriwSTat6/fp17O7uZj7LYjweo6pG8Bno7oeULUPbImoAKTBeW8Md63fgpWf+Av/qn34R3M6ghrG/vUVvg9D6mGJrzoKqgtq5zIn1dBNKNwSjywFech1aQOpRqGOwtwtp19+Gq2JA+btsh+VGrDGmgyUleaTeIAMkiOI7orAwDfPgUdUWHFqMJGIUG+j+nlKYgSlt94LhSrVR4vFxC+XO67ORZCm+2mMdCNTjk/p8V/K/ZdwiInDOdTGqbLuyxfsSoxgj2rYF24T2x+NxlzEleAhTB5A9Wbx69Tr8ZBfqCNcrh/Wz74UVIPoZVAnf//73lUjxsw/9NPUTynEK5Rt1uo4lDFHEjnRV5U7pwswHCMJiiKqquvdEBHVdwxmL2WzWkX4xJu8RRJCiM6i1DEMWqBOem+zv4e3XX8f45Cn8zZsXoVHgqhGEFSd5T+8+W5FqBCJw5coumAHfRhh7e2JW6VTbG1XfXbAUwRe+8AWqqhH+x3//nzqbzWAtHUgIZeuVrVXX9UAotr6+jr29ve6zIoL5fL5Y0ZwQykJsn9jEqVOnMB6tI8SIYAxgAQWBRfDOhR/hwlvndRamYHUYj0ZgRloEDQvhSl6YVbDiKCTf71Tbo+iKwUFYMR6PQOS6TLYc2Psl0rBgRldrLfqCCwOHEBZ/y4I6rqqqi3PTWYNq5KCUyMGIiMIhkDDWq0ROQgFmg6bxqCoLialHaa3tPPdWkTzfTEOy0MYl0Pc9qfz03h80Uu8CV3H7yyC16y5lTDabzeBjm5IDMwzxgYqDNDVVyvFGo1HX/NWlrtWtaiOOLWYrZU4/0/WbESWIFy5rlbHpkMwkIr22/yJ/1XWNnZ2drv70bYsQQtrmsN0RiRdyJiaD0AY8/fTT+r73PYB7772XDtesHu5ReuvGSregiF1DoECA/pYs6b8f+AcZqbcFB56Wb7u/yoVc9N4nSigAQQPYWQhnXiym/rMIAWxAkrJ1iGnvTSZTOOfgQzOQcN7IUKQHjSUA7NH7MOGeHOIS8GvTyrKhnB0pA8GFyqV4WowR0+m0C/TIuKleG3VJQKMgBElkYc+QxInDjUFTDWoIrC5dTlSAFZPpFKP1MQwJDAEBubzKu2A2a1JnSudQTWUQJJdCtMpQ2mFXGoSiBEhvSlNaUPd9992Dtg1QAS5demewWswM7/1gqw663DEu/k+TUdCTd/cTg0Axa+bJg2ME5/MU7WrbtrDWwo4y5U2JLSk17HR/hmef/ZpOpxN86lOfJLKcvKNnqKgK028mY7n8W1zPTQtwVRXnzp0jAPjmN7+tyViLmrJpmsSR5y26nBW7+KeL38fjcWfA7v38Z0RptgKVsR0e6ycX7bMZ3Y4AvI/QNsLaCkEYI+MA9WkXLCUdOsJgNx3gS4c5hIAQ2lzXjfJuNgcK8bIV+3Go47JEu/iVyhM7MFapO0Nosb+/D+MSBAgmwCqhruvuOIYYwQsqZ1LLXnN4zgmnqmp436SY22M/6dhSJL0VYy1gARuCaOhKmkI7F08q3lRa8P1YVG6yv5rOuUEJVPBWCAH/7vf/PU6cOoG6HmE8Wsdnzn0a29vb3XHbtoWIwLeEKILNzc3uFp0z8L4BMUAaOnq7NFAKnXN7oAPJwXZ+76aZOTEQmnt/zi3hH+m+UyhoHtSZOY6pwPS+Z8hCSbCxsYG2bTGbzbA/m4O20XngqK7Ret9dR4yx636XeBgloXZQRIweGhKdDSJ4Sv3NQzn4FfjrpmMWwaSGBgxUI5xzaYUIOeBWINKe9EgGNwA6CFT7YhONgKGAauRw5cou/vXv/C7WtzbA1qKyDru7u7h+/TqsMbhrZ2eoBjSMmEW7zAwK3MWzb3/zJZ3P29RRV8UjjzxMm1tr0EMj1LuMWctisFJCqCp88LDWHUDlzD1cRQcHnwBgf39/obCJgCEG7zPa0GBvbxdt9AAzapeKc+89eAmvJcEJD87f4UAStG0EswGIoNAseqF+uL3NmtI8R2NMar1vb2/T448/TufOnevhKx1ccMdp6dGBtDQ2Sgxp27aTLK2PxqhdBdacDPrglwAyDIHmc0uOY0hzQsaBqcr/LAxZOGshkkjG3hjHMWjlpRQ6oICXbyzHsCgC6xgmp+Qr167AVBYaJCtpOG+NZCTLBko6iHcDr1DAUCbqMyi0VfIKQxZQwCmh9LDZGCiAyWSSNRYlgSraJvU01+oRjDUQiV2HmogRxMPAYDabKRFRtVZBQ0xFdwgwhjtsdbRMcoWm9EadEucMnHOABIQYc2NjUf6QousxLhfS/ebCsQquJfHKAZYzB6B+HDsw0icEIcF3Xv4u2JAaY/CJT3yMKuPw1qVLur29TaUveqwRupt5iQScOX0nfelLX4JzNf7TH/5ntV0RVQjDhPy3trYGF3D58uV3JdNexdCW4v7q1asQkY7DKpNrW1tb6bMkiCFt2bW1dcTo8Rf/+1l8+MMf1Ice/hla5ST2qNR5nEaloYSyCZQ0Wj0JZZECLB+v//sy2wrg2AakJW1ZMUwBv306G5Q27Hw+BzMjSETTzDq8RpQ4sBBkMOM4MBYfvIJFZ+Ym6kUVWtGNVmxvbw+2T8FEy8YoxykBvhi0gM5lHr9PIs6nMzS+TbEvJ5+yCKqKnQwxRKQ73rVr13DmnrsBCJ595jkNIeCOU3finUtXcPHiZd3cXKd65HLGj10xPYglN9v2Xkm59ARn/Q7Pqvi0HFNKllsmBJc/XzzYe4+maTKtErup2n4SqaoKzjmMRiNIjJjP52jaGZxNIrn5bAYVwfbWFqqqxiuvvILz588rlHtAV1OT9d3EjNLhoXwDm5ubSX+qh7Ok169f72LI8vkPM/wqZN2vP0UklWEiMGbY2rp48WIWCQu2tzZw5x0nsXPm9AHMV7pSrW8XqiFeUIH26CLy+PgLtJBYMwjEQ88oFwMATdMckGqXwFy26qpO+UBDtdTmKkpDZloMXmlakKbxnbzprrtOQ0TR+HZAYJZkUL47n89z/ZiOeYwm6/GRfeET+1ttOdWvSukLVc3Nn28Q+0g6gvLUqZO47757oYgHmhT9LV7qyX6DBQCscRABRqMRmGzHUdhV7etV8L5MqK+eE45QaMqIObOAU5ufyWTxmuBHF9/KPLk9YNAQQtcIKSxEp2FVzQNM0m1vkGB/er2n6hG0weO3/+U/IyJC7Ub4gz/4D5pk+Jo1p4zvvPJKZ7CTJ09iPB4vPJEIxlqQMtpZwJ/8yVM693N8+tPnyDkzNBYfYbgb4q0I8Iq+nHWM4OOiXmPX6bP6Z+lvwRDCAQZjlV5nQNh17bMRLl++jNDuYjQa5fOlVl4IAaQ1nEtM6961CZgs6rVR0mJI0UnYPARfgXo8mz1O0XiUtKijXnPcSS6eSDZmxt7eHq5evQrDDkwWMWpXTqQR4bgysBfu7NB2VTdwbrKkgSAxLchTTz2lEhSn7yxTGYyixmWk2Hj+/HnYqsLu3jWcGa91wHVR9KcZMwNCjArnGCzHRMeHglJj4NuYjWB60w2Lrs9ii9ESPJGVGfNYhJxyBx7LP+vSlt/d3UWTa8QCIcoW9zHAxwAloGlmmf1t0xhfaJEGcmVIiYd4+FTYcRqu/fT9wgsv6P5+A0jCNKUjtMgmqXERY5lxLgITSlsEC7A5WN1j1KlsFpgrhABrWZ944gk4U+HFF76ZFyMZrJRXIoIzZ+6CtZyl6xHECyjCWY9qmKEw+Na3vqUbG+MbtMKOacT5vMV81sDkwM0dPkEaHu+VNiHOgYzW0zMdXBqV62XRVUbpmNkeZBANCK3A1a6v06e7794Bw0A0aOUqxCBgw5hM9jqm9dSpE2iapqN8UrGfmNcoYUE7EyGK4tKldw73rJsb12As5NsC8YKY3V+FYE2VH4QR8Cu/8hl88EM/QUSEP/yPX9GrVyadrupG9Wh/+j5qSMY2hM9//nM0n0/Vew8fZvChyYOimkGqhUA7ZY+I4Pz5N+DMYlKtJKO6rnHpnUu4755705izTzhrEOBp+eE2S8j5qJiW4kICokDyKqVEPVtr0TSp/SQaoIiYzdMocFXbbosOMt+KksgYg6gCUYFESQpnQxiNKmxsjLG+UVPqWbYwhhF8QNu2KVYJw9UVrLXY35+l7lCImHsZdHBGoxEIaXdcuHABOztnBvRSR/7pSrXxjadBF1orD5GA2f50MFgZJG3Ds/ffg9/6rS9h7/pVEgkgMOrRCG60j5jVf6oC4hTnrKmS8NcsNPNpuDzN7Hz00Ufw0Ed+mpp2lkmsUiXkBSbGZ5/4ZRIpsCRL1ckCYDz55JO6NtrAfN52XaqkAEq9z7Nnz+Ifn/t5MoY6NG9vD3oXeJ8ejdJP+cw2UTgxYn9/H957Kl7ITF15YY3t9FOlNRaDoKqqrgkiEhbehwjvm45BMCZn4SwGTr9rNx/UZ3nTQEHaDT40qCo3EOe17Rxra2uI0cMYQogtrOMbk3/H4bSIgOl0gv3pBM28xaha66lo8lC4RFzb3cN0OkfIaTj4gBgJTAYSU/UffEzMQQxpFE4UVW0HnBjlhsO1a9dArODs86JhWProQZ1rDIqXXn5Zt7e3swzhXhAlzGXUoWlmuO/+e3FytokPfegD5L3HaK3uuk/2VuDCci/x8Sd+lQgOGxtb+L1/+3taYTSIZ0SEtbVR92CepBhkPPjgg/jhmxdQV8mzvvybX6TNzXE3IbG5sa1f/eof4+23f5QTiEKRjH358uWsv9KeUFgX4TYD455GByKCl17+DqxlfOTRh/H+97+fRAQvf/clda5G4+d4r30PPvZzH6PyBAEf09SG3o5t2OlCYzq4ljimoYsVREl9R6SwDgg+e05s8MEPvQ8iwNWr78BWgJdZilNQeO+JmdWwGzxeBQCm0+nSQJMOvL2oX/pwJISAjY0NxOixsTGGDwtQ6pyBsQ6bWxvdlBstSaQGOGvZk45THyoIlAOzSIBo7LJjkIBf/tXPYGdnJxWijhGCh3WpKL73vrvpnnvuyYg5dYiZAeKI6IE2+KxiPoi56rrK1UKA5ocCpYUzvQw9vLe6rvFLv/SLlGJXYim8b/Hb/+KfZ4jsQKQIGlZSQfaoLbfqYYerKw9KmqnMg9ejUWrTI+L06dOUqJv0oIziDdLTqhIxiAElRVCFjdyVUkSUGINuTsFCKXaFtnaCKoazNjOli4eYDeMvoLlGjAWi9ER2okcPSNk+tjk4GTZsMKxW9RJUAJUMF2J6dEBSHQuef/55DSFgfX0dDz30M9TBDVo8kiVN7y8GEkgVbSM6MZ5m03niyQygwt08UF2vJUCjhSkt/IND8B6rWn+pwSEHVMj5otKcePaxld2dZTJuQNTdINiX4cw0V92jWvJsDZPBm2+8hfH6Gi5fvoJXX/2Bnj17FqfuvHPQyCwIuU8IkgAioqnMScfS3hDCZLKPJ5/8r5oUfXYgBG7bOb785S+S9gNJkSKhN6KinA3T9/L+e8Pmsn39zQvKbLvhpTJFX6jepkl4hnqqPOluCl0HxlAaB3GuTsOdgtwBjphN21zkOvg26blUpaei6S2EaHcDnJ/0ltgMSmRiHkH2bWFJDdIT3NIAeRp1WcOFt99RSlLTTmRXdGClDOu0+yb3P8/cRUycOvErxsds2wZIoWd5IfxnZjTNomTgwlT2GwYoPHoeYevwkEJ5wWmpajdkzlwemoFuEEmBJS0EJWloz+uFkBUwstCcxuH8IrHpiuHd3d1Oklkomo2NDai2OUuaHk2UgK4WbHbIs/+sCi2qecWgzTRoSemN68P+78O/Q0b4cgACHMmTzdN3ikZ1uQHCSw8gE1EYM+w79oezkvGGotIOn+VtlzRkq0H58DF2uiiilbTH75QieanLooouLphk2E988hNdNZm+GxeyybzKg4kKrPL49Bl2Fh/48Ae6AN5vwHrfJGk3EajENM3PpdGA0Wi0eqyv+73fsE1xKW3xxcTugWcrV3WiV2JY1F2FGgYBzArj7MB7CpKGLgJuIvfCAS8o+qzSSkoLsEqWP1R7MhMEipBni5ksoqSHWzClx65Ya8CpN5IYThCY06BnAcN9WmdgOzWdNxJrFr0JWBNKMb1uVEfh3H/fPQeeo7GYBB2uOkmKHWVF9vf3sba23uvTMV5//XVN7aXV84gpvtEQemhcSWUP6GXuP6NBUVUWP/HAAyRSmhuxk0gJ0ItJN5ZBspZ6MibMlQEGL33OptEOXULs2hM562JEgzQ93lcSg7i+vpbHRlz3tFs2yKO+2jvK4qdCoTJohywmTkm62o4ycu2abxKzeC2ttLMJIjjnUJ6DKsGnxcwi2wPbj7Q3ybG4r4Kt0IkmaSUB+n8BZwbZjznN8a8AAAAASUVORK5CYII=",
  boss_crowned:
    "data:image/png;base64,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",
  boss_horned:
    "data:image/png;base64,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",
  boss_muscle:
    "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAFAAAABMCAYAAAD6BTBNAAAnk0lEQVR42sW867Nt6VXe9xtjvO+ca619Ofe+qLslgS4IEFcZCDhgG7ABUyhOysblJJRTlcoXqvIPmHxw/oN8yxcqlUrKdrnKBoNBBkkGgSIjBKhCEkBY6Nqtvp3bPvuyLnO+7xj58M619t6n9+ludaUqu+r0OX3Ousw55njH5XmeMeSX/of/kcd/ImL3ZxHh/+sfCQiBKgERIAoufOq3PxUnjx6xWW7wMmI1UISqAI5EBVWKavscD5IoYUGHcl0SySGLQC2knKmHHR/5qR+TbrHHxz/2e3F8/xHZMuNYGeuGf/SPf17WZSR1+Y3XKYK/xb0k/n/4CTl/ULI1KLBer1mdrrBQOs3MzCilYCZIgBKUKAiGEwhBCmOoI6FByh25OnPLZAtKHdDUMe96hloBUBJlCFSMzdkadyf33SWnueRIb+FA6Sqve/xD3qkX+gVjbT3v4k8WxT0QCVQERkdDSe704UBh2HqbBH1xenfcgopQQ0AhInMcwf61A6pk1hVmNeirUxzuvv4oqgrhiX62YH28xALmeUavxiocuPoedbqPx/+8M+CTDHfuLUJMb/5mj6mpUAXwIGIykgdou9iojkgHFERgLANJlAMTbnXGfLHPnx3dxwlqqbzr+g1uWkcy4d7JGW7CypXjjbPxkevPPE/ZjIj1+LqCBF/8yz/nix/73fYZ9NODA7UEHrg7MT3Zqxxle0pi+je94BxveoQfP//+FkZ8/EEIgruTzMiWWJ2dYS4QQXWnSGAINQvdXPEyIh4ozrWceToJm2FA1iNYJluPV0PU8LGw18+oImiF5foRe1Hh9AiThI4Vr8FY1szLEiuCi7JKwpCD0QsHiwXrkyVVKhGCiLzpaZMI4tL9NRulJx09edKRjLjSkLL1rp3xvf1drXSqfOrffyo2D47RABeaZ9agdHN++r/4aUk9FA/MehaLBTMdyGRCEq4Jt8zLpyvuxwlCaTejhoVxYMJh6nnlpa+xiSBFBy7kccXf+rYPUodKUeMPvvRVBhGqCHcfHiExIhgi9R3H8/R2A/7F+BXT09q6tIgQ1S+7/TbwB/hmhLG2DIkSQCEQUVY1iM0IOTGOFZGEpYTgmCWyCGMEXivaZVwEAqqPGIF5kLoFQ52MKkEpzaMwqCJkKp1lpAykvgczyuAQQkqJQuD+zVUc29cmv+Ls2wVDBIEGO59sIa3FtGbE9u9/+bk/ibSpqCaqCbPUbkKAGAp3+h5uJEyVMZyxOqfHG27kOf/mX/1GnFFI3lFi4At37/HlWnGBkQ6SNq8fCotrB0gtPHswpxdlrs5iNuPeuvAnL79MNSNEmIfSRyLKhlGCta8pnaHefKZaYRwHigoxCqLytpLixSMMkN7K6hpXfVDgChqCjEE6XpGPVswCIja4NCOLtUSRzZjHFIgFTBSqIxpEVIoHVRS8efSIsBElxAkNyIKXQFGITFbhQDuudUbvG0qtLERYuOMIS3XGCmMZKTVYxsCZO9ErPpZW0qSgjBs0Gb5Zo5rette9IQt/M64bEWRVvFSyKJ/+d5+ImySu5Q6XikTQC0QIUQLMiDJiF6KqAxqOTXWWiaAuu9gaEYSAiiBSqZvCImWSgI+nSDYiNoh2RB2xMK5Z5kfe9z42Dn/62mssR+hSz1gLHU5E8MGbt7B+D24d8OyH3i0RzmpYMuJTfn7znyvLmLeTUd9QE9ZK79CJw3KF9HPOxoKkZgwpiuh5uSICoi0rqygeDmqIBKItw6UpcwOECk6FCCIluih82wvPo+s1m3Fg3AxYrUgFJSMI4iP7DjOH9xwu+OKr97h57RBLQR2d3pSuS5Qo7N08YO9wgQatKNe370CPGzF9M5537rZCJ8FMExbCOI64KFqmDC5GNsWyEuF4jUulkaMgTqgg4ijeYqWXlpBanjiPyQG9afNUM/bmc7Ia4kKgRBTMcistqOypsCfQeYvRXZ8IoEYgOOO4IpvgdSpFUgL3d5aF7ari8Urjtde5O5/9nU9Ft9zQifHM4TXQVmwbQlZjsViQbYMJhOj05IR79x+BNANHdQwDEbQUugAvYF0mECpBj8KmsNBgvH+MhLdfCKEOlthQsM448YFF6lCB2ylx+N7n6TURsaIGmGbWw4DVAavNKwklpNWIGoD423OiCzZ7W63c43FyXG/IJbAsDMNA17XuoKzXuAddFmIzsFydcP3aDbpuNqV8x10wBC2wZx2lBB+48/RUKrWb+fK9e4zJ+PZnn+PQ1liAemBkNCcSAuOKs7O7fNv3f5iXz0b+9M//kqdu3uKgz+yvNxyYUurIqIHbjIKylorkxLzr0UgtGUqLx29lvCcd4/R2LL41XkSgqvyNv/dR6VFkLNz/ytfilb/8K2ZA6jpmsxldUiTPyDnTdZmIVqhev3UdIvHavQcgFRFDNTAf8c1InzuqGSkGXDrmOWG1QlQUwcyIAtkyqsrt97wHXfR89vN/xosna76xvIt54ac+8K1EGQgTBsl87itf4awGowQMA99345BrolSifbYIEZf79re0y7YOvCpV1wjkgkeWaF2FidKlHjRxOo7knHjmW79V7n71pdA6oOqkpESM1FByP6NGZariUBWcgBSMYyEEXAUvTu6NIUoLB0lwcVa1knSBlzVmxujtOlYeHG0Kf/qpT+M3r3MiHVX7FkSyUiSRUwECr4kSHWJCjYHZbA9NXQsq0nquoBJi7ywGPt7j1gjcQMfARBlxRJWg8vord8NXzuHhdQlxOhVKwMmwRlCyGl4KUQZS6qnRPkMnh5cQFIEamAiuEMVJqaOOA9JlCoJ4kFWo7pAVqa2rIQKVCgFLhP7W06xmC+Y6Y1wvMR/oNTcP8QEDKh2zlKjjwIEYtYy4F1S3nae2mvWbBJz04hG+GP8adhktuEarzQxBSnDvS1/npS99nd66cHHcC4bw3FNPMRRnA5SxogR7KpPhGijK1MEgMOs6Fvv7xJRQ7r7+kFAjQvBw7ty8BZY5WZ7w4iv3udHPeO+tW+Sc2GzO6KzDTMg5UwK0DLz79jXCnZPlinWp7KmRBYbNwAv719EpxNxfHtFXx0oh2JZaQrzTXngL1+zqvClge1Icx0bn61/8jyEnZ3THZ7z38Drj2YrRhbCeIsGDew8QD2YqLOaZ64d77F34kjEcpRXGXp3eUqvdEEKFiIpqR63e2shwaowIgatycHidYhnqhtRlolRu7y24cfA8gwcnZ6fUsxOiW7AO4aVXX+fmc3dQhT4PvHT6GrVWvvP7vod7L50QvVE0dh2V0Lqqd2TAJ0FU6kEWpZxtuP/lF9kbnbkqOXXMn75FqPD1V77BUIMqhmlmUyupQnEhXFqgVWktmzfYWWlFbQ1IEoze0BmvFZvA03Ba4olgJkYWhbG2Ks+FWeqQUukEFiJc358hsxkvPzpjL5xaKyLCWAs+DqwpLLVw+4PvkTvf8wFcoEjscE7zt59AHk+w6Q29nrQP8+WGL3z+T0NPV8wLdNHi0v5eh0SgyXj3u57lr156GUmJ6oGmTOrmPHh4Qq6VOo7ceeY2EZXjkxNmllERFMUkiIA6tVliRvj5dZgqe6bcmM3RUhjUCVGqCGsv3JgvyMmQ4lSvmAp3Dve4dX0fp+GLmpReEzf6GQtpWGQAIoptS5G4Gix4uwByuhJxEMHHkeXRMYvRG3HTmlMstXg4lgLhzPuOk6GilhnKyMPTYxgLtw9m7YhEeyJmdmW9qaq7DI8EQUVF29EWQaozEngZWYUylJEaA9kShzpDorlPaekAXFFtNEEJx8x44alnWbuTUcoEh+14manr8XcaA68uY5zYjNGVSh+GeCs4UUidsVyeEd6M8sKdO0Q/5y++9iJi2jxKBZfMWMbmZaMjYtNV++5iW7Zs2bzG2LoUwEwZi5MkYaYMESyjUggiZTR1LQubonVEUZRWo6oHoUHxZlgLKMMGgd3RLu4oCeQieOxvcCR9JwaMaLFvVUckWusmIugUn5Ke43zbDO2lwUkntYAYog2NKeG8/OrrWDg5Jw4XexDgEsSU/TyCm4f7rXwCUKE4lJMzpLZju4rCSw8fMoaRSeQk7AVc63pK2dClHnWo2uLuyXrN3DrEg/CCSSJqAXFqNHgtqu/uQZvjviMv3NWBCSVNxympUkQpPhJpNmHwBfX2hA8ODxnWY6sba8EJbl87ZK8EHvDw+KQV35pIyaZypj35bbPdqnknvNV4Uh0kEDUknGwNDqs4kjrQbiKTFa9O1/UM3pBkzYavHVKCUE43A5Y7sgUpdfgmiOqU1QbbX+C1ToiPTKVUPJGVe0sD1oCsiT/++O/E+uiILiU2Y0W9QfAn9ZSD/X3m8zmzZJwdnzHbPyDnzGq1alk2wcE8c43Eo9MzliY8ODlFcW4vrhNe8IDToRFHIoZ7oXFMgWpCAwLHJ2ogvN0c1mJmhxJiaFbEK1947T61VsZwktxtDyGmEyHt5Ditjz9Imf29Pb7xiT+I0YSP/PiPsHj6hlSNqQWWJyLQ+pgY4A0GTGpILWQX+n5OrZWub/DO8vSEvusZyoZaDZJNxzlRoxKiqCh1goVKqe3IB4w447jhmldsKlVb9e87VDum/0bQsrhuA3tLBO4gZq2kMqHUEfFWkBegAmSjhqAToRUx4YlTNSEi1CnZygTelmFsgIAHEg0S83eYRhLVMVEsglRhRmKoI0/fuc3pPJNEG9Y2ZbQEfOOVV1uXosreYgG1cLpaUiUIyVw72GP56AgfgySJ7E5EbQh1ak38/GCPw2sHDWRFJ89sj/j09JTj49MpUSlmQnd9fwdmkDKvHZ/x8GzJgJIwaOoQypTlwxo85RG4KUWC7IZEUMcCHqg7mhJV3kj6P4lce4MBSzhFlA2OuCMEEQNG5fZ8H9xZnS3RZJAdSYk7t24y0kqNBw+OmJuhmvDUeuOKEK7UAWpRLCAIzISojfDuzehSplZHJSFRtwA2pkKaaNEGYwUzax6jBDWCB2NB12tm/ayVWKaEn/O1lWjxVaHve2JKkNVp97JlEyfi7J0qgFIWRYbCuNmwp5CTYdJj4VhIa8jVqAF9yrgXkoN3yqjw4v3XefrwFopQRDkdN6zqivtlwM358sMH+Lhi3mU6UZ67dYMchXK6ZhlCoQEM7gUlmM869jtlcfvaDnc719IY919/ALXw9I0Dblzb52wcWG6Co9PT5kYquAs6GdFEoHijFcwYfKJHaX05W8XEW3TDj0N7OwP+X5/5XKzv3uc9N24yL4V5lynabsapYKnhaECtQRaDKJTieO44GzfcHzZcW+xztFzy+tERoxluQo3KsDymN2W1aa3Xc/Nn0c2GBJR1mdo9RSUIH5GipByotnqyhk9Qk1J9qttC6SLoLFjkGcPcGFYnLL29wL0hP/vzGWKKbzZo11PC0SQsul6kBpqU4hXquCvo62PgsV/gvq/0wNXRMToUxCepRRmxJA27E6FEoUrrGFQVCaFKIUKotXJw7TqhmbPirCugDellrGitmFmLOdZ0MnUqIcZSSCokmkYFcdwrQd3lPvFJvTWJi4KGQZkqEk2+gReSKPMuo0Dxll1UhMWssXJpNkdEWNcRj5bRF7nnbFgh6bwAfCud0NV14HogD5XNcsWmrjiYL9gnIdaYNLWEMzCOI6WcYKIcb87oFweUUMITrx+fMERFsamOE771znWSO2MpqCqFQhLh9ddfRevA83eeQgmEsRlsOlFbNUPrR60d463AJ7y9J2rrWgIMx30gS+AIXTI0p+YQY8GSTjRpoKFkUf74k78bZWas1PlPf/onxSy9YxVasi7DZqBau4BBvLm9OBbgY0XDGd0ZJ2j+4XJFVzPdbEbRzKmfUhEykGKq7gnUC3NV3J0+JYZhzbueuQN1oMutRWzouO/ii4jhNBwyZEJ2ZAK/1BAz3CAkU4mGuJTmnSIQGtSodMmoEyuXcmK5Hpgv5ixC0FoYXbBkLDQzApXYhtAro+HjdaCcQ/oTGuKx066AwxQPVOBgMWdPQLxlu1GMV07X/OB/8gN8x7tuyOv3HsbH/s3H0QjCndCEaMu6IopZQkToZpk6jvQBZRhYOoQ41/cXrTIswmY9MohgUgmcoorXzP0HRy329YlaC3dPT3AzXBJaKmYJmLxIAthm9cTdkzMigrOzM/Zu3EAsiHDieOAz//o3414MfPQf/n0p02mJaJYsk1EvGtCn/9k66yTtmJRU2pSfO/nW9ObGXIGKMrqjex19b6TDXkavmAmp6Zwm2rLxt4hOR++8yF0PAzlnqlfCFBHFdaI31RBVNISQikiQUqJWY0Abam2p0aK6aZijNhWDmGFoAzRqbYi6O6rGmiCS0EumpoTXkRRKth5BKQQmMOiETU/Z2S6Iqapd0MTIJUA1LgkJVc9hJ73oti6YCaMrH/zwd/BCPxPrOywbdRybkeI8GJ+t1vQCJrbzDMXpk+weEkBxZz1spu8Yd097ep54DKwKPDg+wVVZ1DndFNdAdsLN4s7pejOBET6R+IFZpngjtmICR5JsgdvW/4kHtVa8ES+TwEp3DjS14E3JEG9ApGWS2Qq4UkOa0Id2vPxiTAglpBKLTtJi1iS24STrEGx6XXtP8aYS0Gh6GVWdFAhGnSlhjaszacoGpnpw9z3qu+y4LDCY4JYZhoGZN29TVXDHE4yunI6tvy51gt9w0BEvQVLoRCYyvykUmMqYUCE52GQotsZ/UvsR562LokKIIlt1kgolJ8hGSDNKaANTR6+UlnoaUKpTH+mtf3VtinqnHSuP2PWk23puLN6AhtmCGjIJxh+jFMV3NVjTQU+StIn2HGvZdRHNiNLgMwkGD8oWqFJrhXoSNnXAUuJoecpyXCHSHl6nRofwBx//3fjj3/9MmEM0seBO22MimF/d7mlIC5ZVQXPHeii8+PJrnJyuGqIx3fz2govXnbGjtiw6+qTwjIqXkRStEN9mqu3v7s4YcPf0jLMaFEkMIhRJjJJ26Am0IA80DUwtSBQyTqqVvEVepB2z7C3rmzRqVQDxihTHaoMsNLXifqTJi+sFjaM56HJFuX/MAqPfSpGnZILHFhS67IUhpGLgfeLuo0dYCbqUMEuY5uZZGk186JUkCZcGRDLFoG3dJhQO+54+zbEAa8xQ41i2yciDasK6Bl95/XXUY4p3QiZ49+2bJGkG0i307s5+n3jXzRsN1Z7ES0cnx1Ra85slMYwD6zpgKbckYdYM5K26NlW0NjBjXSrmDTAOa/zzLZ3TG/zhJ38visG7v+OD3HzmKYlJUatclt/tYmC/t2D58BgUcko0TEmoNZDcSGdiC/0E1Ss6BVTfFreqSDh9UvbnmTQ2ZuwNyuPpSBSC07MzqE6NBjH14bxw+zZbhkKivd5ro0TnOU1lQ8JFeRjN+512ydZ3/LXv+jCzxR6/88lPNo5l+k5FSVMN4t5O1Gk5a4lmkt09tdhDIjg9OcOz8fC1u9x6+ilEz8XnW5n5xYI7/cBf/2FZSOJj/+pXI6bgSXU6TUDjJWrURq6LoA572lPGgqgyVqfLItkIk4q6oe4UsTYKMyWiHUhqSkhCUsJTS/NbXqJK4zbSRMYHND2MOzaFBJlKru0RDqJhj1l4//d8e6syPmNRCYahEN5ETGI2hQiZ4DnbsZBOZYxgZok+CtVh7tpAkyTnJ9bfaED5J7/0T8lifOpf/EocaDeBjpUXrt8k4aCBl8owFB6tN5yUkRIdx8OK7nCfH/27PyHrcUNdbeLzf/h5vvzlr6LWUemmziJQ20rCFKXVjMkaH7LV3eQYubOYkSPoLlT7FjBuKyRtmhnbCTENjUZ18u7bfO/f+BFhrOzlfpINwyx3/C//0/8c864np9QGeSoTtdoe6KqOiBesFm7tHbYT1SlLdRZP3eC7f/Aj4u6kvt/REiKNVGuDNnJZgSrSsuxgsCkj5sIowahKFSVZQsag74WkFQtnuXaOzwa032NdRqyJRqZ42bLtWBu5hNB0L+eFAKGZZcpotDrNHBJG1ILbVJwrUCtCaw/b9bbE9tz124zLgUW/aEgRgVrgmxXdokM0UYZCdiNECWsVhQ8jfRLOFCT3kxA9WFTlWgU93nAQiWqQIrGJwiZqi521krapWVV3ZE+E8trDh2Aw1oFbN25SUUYfQQxq07wMw0CIUxB+7/c/wwfe+yGef7b1oWUqUBur1/rbSjCMG7745S/iMeBToE9uRFROjx/tFLAWgoQySkEmTjlX+I4X3k2qtRlPFUmZb7z8Kv/h//hDhs/+Uagqv/CPf0HG1IYpPAr/2X/985JSR1+Uf/2///PwaKkhqvPUjWvMJXjpZM1pGXj19BivlXlx3nXtBvX+CX/w678dkZTVOPL66SM++l/9vEQnlFKu5oXdndFrq5UmKVhEC/hJraX3qSypJagTEbQZR3LOrIcNkppxvEJIbb01ja81aZ+tu1mTNlfifk6ZeujUFmqTBNOGc8ZoCrLqE59ShWVUqge1xjSDog19McVLUz3UKIxqFIVMotah6bm9DTBmFA2FzijhlNSog86C+XzBWEdcnHnfo6pspr45MWWhXaaJaZxAIOWEIqxOV00u4dsm2ukwxuMNf/Lbn4kQYx/j7qsvsRoHNhegqIsApXrQ+cC3XLtOJ+ymLi+wnQ1/NOPFu/fw1NSoNZoYs4bjfY/pgpdeepGHp8cU0ZakrE1cjoPzz/63fxbXbh/y0Z/7u5K0o9ayUyD81M/9rJSzIT79iU9QCR5uNqxXZ4yesD43NDsUM6UY1MF5dO8+PhXXxQfMDK8NDE6XSJOpzKjewIDNWDno52RRNrVQJBjLQM7G4EHf73H2aIOZYaVQvLI6O6WkjuxGpWW4bedj4eQI5rGHFcesMWYuDQESb1OYG3eSCkVpbZgYUYVawdVYRXBaCxsP3NprvW5I0eJ3nC65uzrl2mI/Hh7dF9PG+BWc2Y19HpWHsoaYdR33z5Y4rdUTd5ImkmWSGpvqVJzTzRqAg35OHSpagz7ldoRjUgREtHg19S44kLbQjgknyxU/9nM/JWebNWkxY/SKSqJ4sDpb8xu/9m8jW2IMSOFt3km8lSPirZ1DWNbK1x4dt+HCKTP7BBvJhDeKZSLAqvDMjWepNZr358T/8xdfgN6oEtQkJHc+8tzz55k5hNFHjocVdVhKtUYZKUrBoWzYv7bPz/y9n5W9bsa//Of/MqK0kzcMA5vNhu301oPTY/qcp4mAhtgf9Hv833/0+Si98u73fYvslAkR0SbIp8lEEWFTRnox9vKcmoQyz8hBRwkhJ8WjMkO4/+io8XijINpRykCyVrLYBSWPixKWWca5t2+J8ICp966TDC4jRZnvXSeTGIYB6RIhr+LhRC1YrewhPJ9z+65uEir1B2xMqY+OkCxgHT46WbXNq1CZX5/jHmxiM02JtnGHGo5oi41JrRXu7kSp5EUrzb76F3/F2ipP334qGh4YMBBNrb6lBYeRva5juV5Rx4JkvQDrTPRkOC5K8ZZxt4CkSvO6Bje1eHjOrNWmVWFKMtP3IxMqLHn3AFWbjlC0FcvJ2t/XWjAVLCVsbEOHSRqa0womEFVmoWxoYQKRHYzXZlGEinOyXrKQjjwV6KY2lXIN05Dps0KjYY1TZTFQpjKmOqjy4//gP5eUUiNvwomzNb/7678Ve6HNUAV0KJBT+7ChEUKbSSUQXkhqbbZNEqLeDFemyXKblKjTOJiGTkYNnEZW5Ug7PC6oiDpHR/dY68jRo0eoQTVvBfCE9NisY1Ur86hsxjOqOzfSDQzhs7/17+PhLPEjf+cnxLXtaGgGVqI2BOm/++9/UfpQPv6rvxmro9MJ1m8djmyVDVP4OK4rlvWMn/9vf0GOywo1I4lN/a4oYylTfdXm2LK0YxilMr+2TxdCOR0YF5kwZShtQmj16AjzQp4mjUwU6TNjHUnaNQ+daIKYyhK9OG2xndGIaYLpQrPuEyNoZni0z/cJRG3tZeutqwgmmWBEgFnqSA63ZgfNCFupx64tFzpRhqiUcGaHC05WJ0T1SVbiO93OVvqc+ozNFhytTsl7s+aB573dThYACDZRY2JKeLBerfj4r/5GDF75yf/mH8imjKSkSK18+P3vl6P/+KW43s2a+3uwSsaLL79GLbXVY7FVwlwY4NHHpDyTIe3xQZ8nUI5bVDrRgI7FwQKTPR7ee8hrw132FwccDyPmDbKvEzLUfjlqths/+6G/+cOSUiaqX0Gi64Uyr1UVozdmMKluOYQpTmyNmY3oE/PZHsujY2IozPLE4Q6FLieiOnNN1HFJKhXqmq5LmAR1VTjAidTWlIQIJ5uBEg3VCFqncdWEkE9Hxy/UpuesHRd4luaFOSa0ZhypQN9nXIWcjRjX7JegOJwpDEmmSdCm0fEp9JCM0Qtq2uQmU2e2XXjRqpTWASVL5/PCZYu+XniqSmvEf+xv/4TMRud3fuvjoR5khL7rGixUnMVszid/7d/FzIOMYqr0KSMU9jTxnmeebeWBtot+7dEJq+o8OjlDVVCxnVprK+DcgpweTSft7miafrdGtjMd67a0Qtjb28NqaSR5BLYwFjnz4OExieD//A9/GCTjqW9/H/2dmxKilPAp2wu4T3ms6WtU7BK3uROU7+RjcVml748NWMckWhQzXnnp5TiLwn7fsywDkjsYK7mbEbVy79XXuJV69nKHeBub8lLJU02GKSnaELXVikV7ojUKdYppAF51Z8jRByQ1gktVKdspzgm5Ec63gKiCZyXlDqcitTZlbS0thq9WyNLba4qDB4M2cPgiRG9c1nBvmcjLizT87e1MMLMd7zC/fV1+8Md/LA5ne/L5z/1RPLx3dN4HT31zl3qiFnRCU5xgqG2wtVPFNFFqJSFt+0UEmoXFYsFiNufBg4eNGigFMP7Oz/w0qVe+8ldf4etf/Aaj1Sv7dRGl1uD1Bw+YpcS1aweYdVAKjnCwt8fBwSFn90/ZeMF8y+XqtMinqQJDaWL1x2ZVXR7TST9Grse2lbvohVsSSCVR64jOOhbzW5IkMySjJmGsIxpGTGtKJGrbMLSYERH0ueOstHhi24uICYJyYSiVrje+/yMf5vr16/zbX/sYSEK19bXzvZlcv3OdL3zhz8PdKVGeMPA3PchNsF5vqMPYjnXAIA0W6/sZ1MrGC5uyYWGNKNt6l6hwcaHJdj+MbEHUON9UsiPWL6Drya+YkojgkrCcgI2P/NDf/NEmJ1Yn3OlCOVzs8/xzz3H28CEH+zOYWrRSl/jQGLyclc244Wf//kflyCpFFJNE9cYn/+2P/mwMq4FPfOITTS0TQ5Q6yHd973fJ4cFLESp89rOfJaeeWicIf4L+qxhVEkqwKY5qRqc4NAALzbg4Xc5QKtaGh6lo68EvrDzxK+Qcu8L7sWUTxDcxT2Lb7CxtNGvEJyVXYbPZNBRkHNsYgWXGGowTqLkaRo7OTjgd1gxS8Cbtb51Kama4cfOmrKYeNKioqkQE/XzGh7/3O+W9732PNIVCbVn7YqmRrNGrW9TH9MJGkTb3tz3y25qzlDJldIFvQl5+pUZar9hK4Rf+Xy5ezPSz6OdsTs6I2hiyr33jFTqC49futm0cQRt1TUYlWNY2kzakBgKoGLiTTKjWZobmezP6WW4qVmljsy1KVSwrYkEpIzl3OC1ersYlGj1D7KM23V0ppCnJeK3Qw6BGST3L2np3ydYYvUnDrhNloPLmow5X8cLyT37pn1651uOqYWuZ+lfxSqrC+nTJq196MR69dpfl6QnD2OZ6VdsI/ZiVv/4zPyklQeo7XIQxHHPFtI3cFG9UalQmLYvu6i60ZeJGTwru8Mu//MthZvyX/+gfSt/3SMC/+OX/NfZTIlu6dO21Vjo1xgJF4an3P8cP/60fFTPDPXadz1UK/LcrOX/rzUUXANHt0fjcpz4dL9x+ljKMvPylrxNT3GtzxU1JuqawqsH9zVkcLK7LutZmnIkYkgmF2aqhalRSTlO5wkRnSituValR8YBax9YNRKNXh7FybJlBEnlqbWLa4eA0XG9kAHHee+0mFkqUaUodp9JkJBKX45m+TSOmt7vuZOuNKSVe//pLbF49Ips15bslgkpFIVo8+pYPfYAP/dD3y3HZNNirawDkNIG1EwAxaVLF7BLjheq0X4bdgHZKwi/+4i+KRyFbamub6mZCv42JRMRDqBIs9g4YxxGVyqyf8f3f/T0itSlwqzRC3aO1q1uZ38XT+CRd9DtewLhj7aLFDqlNh9f2DUwdDBVx4ej0hLPNejeNOfg4DRRuhUtxoeSSC7/Ow3pr4mXHK+sEbiTtpqNunJ2ckgW8DHRYi2dTsZ4jqNFmnq8dzGG9Ic8Ta2+SY7SNd0RwacUBF5as+ZsIzJ9owDcb+xTZ7lsxRHTC/OpuoKUdDeFks+FrL30jRlrMa0dumsnYYnM7SItzjeJFr9+SRxG7hl6nrUlBRTw4PT3lr/3A99Gp8Wef+2OydXT7C9bDBvWReVau533kbMnv/8qvR3c4413f+QGe+8D7pSn0J7juTUb74808sL7Fsb047qTSimGx1Fq6CdWImEDLifkPhK6fMwyFYSq220xwbarXach5W7Q/QVS7m6zcbey6sDFOtc0RzPcO2xguQjdfkKWJnCRgZsYYwUKEedeTJhbx0cuv8573vb+J7ZJRvO5GzJ60M+txI+4kvo8encXZ2dk0myZX7gds6+2a4v6rX/0qh888TQ3FZSu4iUsepCLIbEbxJr/YTnxe/OyqUw915cKbrUIrduDp4wtvolFxRJPZMq4HgkZ7SrQ1lUOU1i9bj5c2V6cV1i/f49O/8psxCrzwwQ+Rrh20UQtjR9a7X7ifKVw889RN2UmAp3CWNpsNm/V4eYb3sfPu3sbBxuWKG7duE9fqJena7rVyoWZU3S0RCwE1bbq7i6XrJcM9acQgLvybvEFDyDTaYKZspnngOowwzX1kUR7VkU4gp6a9IWc0GSrCqhTSpkwTm3GJ3t2GjIgmNSb0UqKJaefXla550YC2na/d/l2XLoGd51nrgm22x00e6wy+yZ+38z6HJjOeBMsqqT00bcOQkTK1rbgAr+eqLJm2dr3JpNJbrQZNOw+Ki13xuahvO6Uj1jQsKSW8lAYMbKcj5aLxZVeecElgHm8SYy5BbJdMI6JPMOZ51xSiSO747u/73omG1Z0o1CIYdyuQwaZVLlsP9WSNdp12KbDdShStn97y5b4TjMbjWbhB6SrslhBuVzVdhM3dHTPFvZJUm8KTNr7qcX6MdTpxbnKOZKhRp0L6zTw+wp+w3mb72je+32i7V1NKVHfabsdpYXetYAbZdoU+cf6wYiqntmuYBWVLx8VU3oCTkmF2ztdc0gfeuXNH7ty5XH8/mX/YfnG7kQcPHsTR0TFE7OD3KrsculPn77TMW4NdII8uXtDjBroYi94sQ2ZrN9q+4pyazBPn8S3vfU62J62GX+hpt5VeqySevLHSL/Eijx3h8xprazy7smvm0miCquJRqHW8HAOv+CKZMq1g0+P33WjXFj/bvecCK3fpKkLf0Ju31z6WhqItf3RvDy13XZNtTENAW8pne7+PffwbQsv5H+LK3u7/BearaMc+AIupAAAAAElFTkSuQmCC",
  boss_redlarge:
    "data:image/png;base64,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",
  boss_winged:
    "data:image/png;base64,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",
  cinder_like:
    "data:image/png;base64,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",
  enemy_axe:
    "data:image/png;base64,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",
  enemy_blackarmor:
    "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACQAAAAtCAYAAADGD8lQAAANVUlEQVR42o2YyY9lWXHGfxHnnHvflJlVWUOPtGm6jQELDMbgxiAQHoQlywuzY+kdliwvvbA3/j/8H1jQbRosYQvLkhGYhdXgCVqNaNPVNWdVVk7v3eGcE+HFzcyq6oaWr/Skpzec+E7EF/FFhPzVX/8NZ4/xyx8F3ATVyA9/+B9+dHiMuwCGiiAicPobd0eic/Wpq3zwgy/K+clmqCrujp2e+c4nvtPoGbBzA+7nnw9DxSyTxwIoqgHx0y8dBCMExdxBnDKM9OuePPZoFFarJbVWRAQHOLXxCwGdIRaHoIKLnP9ZBMah8t3v/ZuLOSEECEqojqqe4UFVMTMccFNu377N3o07ToXZ1oLf+vzHRDycX7ieXlYeAabvenN2YXdijKee9smQGwSlimIuOBUXAwyjUtzAz04qWHAsJEpMHA8j7oK7YfbLyfEwZK4g9tD/TFwIIfHqK6/6YrakkQAG7gVVpR8yABKUdtHiGKqCIJgGUm0RiYSgdN2af3jlH/3weM2ffPmPZXu1mLgmZ/ZOAb2TXC6O8JA/IUTwQNQIuVJO41/qFDrzgpiTPFBxEEMckiUqDaJCdWO5mBEGYT0GxrFMNz69+C8l9YRYEFFwwcwQAkqgVqcGw0PAJSHFUC00EpDsSJXJG1IQN0wGPAQ6H9EoqFWqKKJOzhn3h1F4lEPxPTIdd2HoOtwMqqGNgijRKo1AViHXEUyYqVKd6QJRyDWTzQiWoWQSQlfkMeO/kEPn4RKbUlcEN+HVb37L+75nkRYsmjk1F1ZhzqIWPnZph0VM/HjTcetEOIpT1qkNjDjVHNFIWW/4zJMXuRyVRRP5xhs3Oar6CPHfg9QmjriDKyKBft1PueIZDQ3BnTSMzMqaX9tdcZHE9fv7HFajrHbxmglq1Mm1+Kawk5Xde/s8twxoC6mOmIG6IK6A4e/w2MO0V5284xPjBUVcUIcgQtMGkIFqcNiNPLh5h+3NAR9eKp98aonmkeIRijFD+c33PcFWuYds9rDhiNEqnXU4BX+XJsg5ueOjETPRqajh5+DOyCfmNCHh2hKeeJJ2fp+vfOHj7Dx9hYPVkr/8269hTYsGMBv51WdW/OFHf4eDf3+NS7MVt32O6vGUKCJoCORSCKqPwJNHAImAOyKPs14kkGsBVapG1kB+/llpw1XvMcLJEXl9xIrCvdyhMaIYcSZsX13RPfM0nS7w9gnWP75HP3ZUnyp6CIHTyJ0HLD6a8mfxEwcVwUQYi3G43gDG3ToSiPTbkbs7l3n99kbeev1NXzUN73/pc/IMg9/98XUkLvnBncT315nh6AqtRp597pIc9GuPUvj+d/+V7Z2lf+lLfyA5j+fyI/JOUpsjLuea5+6ICkUEJVFLA2IcdYV73slP9kY/kEuEPvPSR57nmdlA99O7DB7I7ZLr647F4jKhOv3dBy6uLIMy9D0318fMZjNqXx+pRfa4h/DTKi2Tbp2VdjfBxAkE3I03f/aW3xszJ/EKxSOzGLh5a4/D8oC+Cl3uaccjmuGEGAqlz9w/OUFc8VNpKLlSir1HYTzzjEOt9Zx808vxWkkKxY3D+xu2ljM+9L6lzLfmdKPzrb/7jqesNCiBga98+ilp08If7HXcOjhkf4D/NdAUoQqg5xn9mKA/nv+Cy+Sp3d0L3L17j6ZRxmEgqPBg3MeqYptKPnlAuyV+VXY42vRcPriH2AxLFREndIMvgkKccePB2zAoBKXPIym1D6Py/1F7F/j8Fz4ncqphr3z9Zd/d3uIDz38Ez4IfwioqL0blfRHCUvjklz/HyVDJqVC8oe+PKFm5/vM9tI4s4mKqNqE9BXLahoif66u8K+1FqDjuEFMihIRXAzHq0LNVM+LGuFkzj4WYe7bbgHdr+q4nSiRlx2qiSU7xxFhHru3dZoxLkJEoAXc5LcRO8KlRO+PROaBKRf005Qm89qMfedcNjOOIo4zF2PQdsWQWsbDwivhItYEYhc1YKHEqKtGFMo6ModLVylGprMeOJrV07kRVBAgSsToSdOpE7FFA+liBhOvXbtB1HSqJJs4YzfjPN+7w7O4uH14u2fY1x+uR6/sdoZ1zI0dCiGhwkhkelU4qP9m7yz1RZLaFmdGoUkpGNGI4EqbMPcPwkEPmoDIVTXnYnGnRKYwa6FPk5w+Oee7iEjHljb2R/vA+J7MW8xbtC00E9YpUY31/Q1he4cmVMg7O/skRXnoQwVUeIfUvSPszDjmOSwCZ2gQTxXCqGFILpokHQbGdXe73sBZh0yRC2MJoacKIS4FOMD9kVw+ZJ6GzzK2SiepgAtUmUNXfu2P0aZ6h4lQ3VAKo4uJEm5r5B33mGKPOdwhBmLtRq6NNQiTgmgmh0kZYGmzFwHyZCAdKraA4boWAUEUeS/+HHgqK1YqbEa0QAQ9CySMSI1Ir2R1TZZxf4ChH0lFhdyXsyAnZjX2c4xygZHbaynNPROK9io6FuFiQrYDM+MCzz/DSb39C8EoxI6q+G1CtlRQCOhZWTWC3aVjnSm/GeLKmTRGRlr5m6tjhuaUJPUuLXJLKYT8AhSsX5ngekbZlf1S2Fyt86ChVWTBHiVwIiZAL4hENgvmZqD9Sqb0aSSP/8s1v+5XlNle04crWjLwoKM5YKveGyiw4T19tsWbBrRv32K+R427kYJ0Zk/CpS5UU4ec9/PR+pqkdwUba4lxqLxHzCUe3bvG9vRv+2T/6XaltmGhxSu34aMcYRVnEyFLTNBiaE0WxkqnDQLRCKT11swYaXGcMBDwlalMZraPmGQmQTU860ywCNQgxFuYUGkmMQdkcn3hMWyLx4UgexRWjYl7JNilwLYYFYRTHo5Cr0Q0n/P4LL2AR/vvQ2BsyFlYUr1xqKy8sGrq8w8HeMTWPqAZ+vZ0TdQY0jKK8vr5Doy0g1NoTQ5A2KC6K+TRyRQdcBOW0nKfIoM7GpzEnaqS3nlJhPoyU0ViWwCYMrLZXNDGiJwe0Y4c0kbccZrM5F4bMk+LM3aleqVsL3sgD61LoMWgjrgknnHcWYEQTI4XA33/9ZZ81LRfaBX0Tef2tt5HU4O7MHS6ERA0B8crzs8Ql7dloy97RCYfrkeX2gq6JyFMrRgf6BTdv7/F0OyP3A7Ub+L1PfJQuRn567QY37h3w7X/+rm9f2uE3Pv4RLl26KFbypBgiQkqJpmlwgYJgQahBqDq1LxljxHCUmcJOiMRSOHmwz9AXemk4dqcGIQflsAzsbTo21ZGYyF1PKBlVY3Vhh64Uijm37+xxdHSCne6OogLKFBo8IDExDAOIMNaRqEo3DiybiC1WnAxT+NalcDA6QsRLZSOVLiWsdyRF1gyECwvG2Yy5Bloz5haosWUzPiC2DW6RmUSaEEkhMI4dEXOkgJA4nfKICEmVagW3zFe/+qdy99p1f+0HrxFnM94+HumbFsxpxFlqZrW9SycjsW/wUrhzd58y9hzdP2IucFmV3fY5SIF2lhCHUjJNEwkSwSYOx/957b+8P9qQPKAC4VRd1SrxVEZEYPDK0SxOs1lwajewkEJyQ+bCzfv7lPmcq9oQ+0ruMofmDDHReaHdWmIXVoRFkNVmx/FrBIOogdu373C8PnFNRrx57QYLiSxSg1UDMqaBX3nhRT708Y/Ken3sxRwXoZTCqm148amLLIc1V60gDvfblh8eHeKd0eeei73xodmSTVTWOzN6KuPYM8xb2Vhh58oV6fPobWrJOfOzN68BRprFqQ7hjo0DrkKMDT0OQdi+cJH59kq6oUdVaWLCcEatzDWzsGkfcHezoYmKUWhqYe6KFkOahmEcGRWGkrEUmMWIS4OqEmJkGPJ5XwSBKCIEaRh1pNWEGaQ28P4X30/2NaNXFm2DmDJaRVJgYEZRY2sleB5h1bLbtNSxwElHXxWPLWXVIF6ZAbOuQUJk9MIiRjbrE8owkFIz7RGqEzxM7YmqTONLrQCsFhdZzOYiY6VtGhgrQYQ2LhAaBon4bMl1H0izGTpb4qEhKaRmhVVYD5maElZGAHIEi4oPxiADf/4XfyZ7e3t845Vv+dnGzjCiOCSZNEcjiCpv3rhGt2z80595SdZDj4owDANSA9YVyGuqGie5w7xQu0pz9SpuMCI0VlloIq4rcbPBBGinKSMFpVI47o/pus5FBKyer2Xi2egjPk0bEgRNyvqkY73ucBGaNtF1a/b39/HYYBoIXrE4bWdrVfSina+XrVTK8Qn5wRFDvyF7pmyn0wFCKD4tGkIIoohXt9Od0Znai4AoqhMwcuXmW9d59fY3PQp84aVPMTw4REJFdWSuDckzjSlBE4MEIj6J81jJ/cBWEDTAIgTMnYOTDa0JVp15amEQorbTfjyGieQKsYoxUGlDxGohVuOJ7UvsELhzf59ZTFxOCw6zs+k7qk8HiBo6Zto4x3NlLANWMwlFauV2dwwls62J5EIS5/v/9B3/7Be/KFThay+/7I6e6mXFBFydeOHyLqvFFjdv3WEWFPoCuXI8DHjNFIVr129QCdOKWJTRHKuVOZGUEtUqmjOLWUsdeoIY2Y0s0Pc9i/mKZIUZQlCnlEob07SVtYoHqF4obvwf0gn7Oh688agAAAAASUVORK5CYII=",
  enemy_blacksword:
    "data:image/png;base64,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",
  enemy_bull:
    "data:image/png;base64,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",
  enemy_cloak:
    "data:image/png;base64,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",
  enemy_female:
    "data:image/png;base64,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",
  enemy_firecrown:
    "data:image/png;base64,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",
  enemy_fireskull:
    "data:image/png;base64,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",
  enemy_horns:
    "data:image/png;base64,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",
  enemy_normal1:
    "data:image/png;base64,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",
  enemy_purple:
    "data:image/png;base64,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",
  enemy_red:
    "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAC4AAAA/CAYAAACfM/oJAAAXwElEQVR42o2aya8lyXXef+dERGbe4Q01vO7qqZrNbrJJ2ZLoQZZsSxsLkicIsLXTzvDGgFdeeSHDgP8QwX+DDUGyIdgQBYoamqQGUuIgNdlDsaeqevWGO+QQEed4kbeK3epmW29xH959QObJyC++833fCfn1//LfMH704zL/Fp8/xCqqCSEQbeJsuPSjacv9rmPStezjAhMwAmIOYog7VQTFEVHUYIyOOgQHNQHJ3Or3vsgTpWm43ywkq+IquAtqAaQiIsBc1Ifr1A//8bjgaE5jlWgFEaG6U8tEqJmXl4F/uHJ+8sYxN5N7pVJw3Ov84CZPrmUC7j7fCCP4fP0SnFh3fGml/Mzqip9aTzBsUBGohpg/KbXKXPDfrDPyST+eqGI4UAVqzaQUoCpGZSmFk7Kjqw4IEhqceaXksDQebP6fz8W7+/wW3YkYx7X3Ewpt7TFfEmwJNVElE0KkFsHEMSDIAQGA/rjCXSBrRlxBAsELLSOSC0lAYyBPlWh7YnaWuiCrM7mDCBxuMCPNcREcBSpFnCBCM46cWWG5cGxcEoqzqnv3qVLXnWwnEDkmSsRtrkl/3Ir7kzfsIBn1iONEzyxyT4hOK7gXQ0RwCsGF5JBzhRg+8vAmM57dfb626+NnogGOUiDXPY6gnjnVTKuFKUbPfZYhnlAEzI1A+Bgoon6o3hlHQpVEcCWhrGrPL31u7Qu7JoTAcLGlK8ZTMnFz1fLFBv9fb2wo4VgqiuMg80MFNyAiBqiAK60XvnA6+U8uM5KVxg3F+MU7a4zKXxfl/nnvU6jiHkELbo6JfGTVPwIVPTxBsopjFITse1o3Vvk+PjmLRUsoGcpEo4WxLyybI3auuOvhKgkoeID5A8QMKZUmVE5lYlmvISRynJh3w0ASR6wDq6hVghguFRMFBPs0jIuDIlQRqs4b1BDMhQCoGFOATjvqJEiIjHliauqBCQTksLktIYCIE9wIQXGvVDdEKy4VFBxBqCCBqi1ZxgMNHpbT5TEjfhqrzOww734IbrhHqisqguGE2FBzxTygzZIYIGp4gjmn4mqo/YiBRZxQHcwoVvGouBuKHvZAwF3xQ8GRmVGqBMTt4xj/JFYRIl0dWOaRxbTxYDfw0FCloqGSc6YhoIuO19+9JnLGOhtmExWnupFwkk2HRRNEhCgLkuHFlCkKWEG9w01QFIsJtcIiD6x067smyjYe4WZPFtw+jcdVCsd1559rYSmZRdkimkEqExNdu6Q47Gvht77yNa76GyRdeZCZ/kxBqkAoiMsBo6ASUTLvcI/P/dpP06VIzQVXyF6pVG5xzatNz2kc+E4RH1Mr5vLkTXxqAxKvLL1wMhWOxi2tBbIXYhCmKjy6EkgrpG3Z9IlWEo3Nm6iIESSgHig+t3k8AoVIxSl4u+R6WJOniZVWJGZqgKDKSb8h5j1tviRKh6WMaAP4h3D/4wonzDfzecNZqYRGmYaJ7uiE3/iN/4mkm5zdOaMJK5IHRIUshmvAcKIaSODQLBGgWEZV2efAb/3f10il59/9m1+E0GNSyFOlQRmpaAhkIhyuJ3+bll/EGUTYh8QqBlyNEIUmtQw5UdrnODl6hTIaZ0dCoLAbJ6ZaMYfgkUimmBAQxAXBMAczR5vb9B7YDVdcjMpyrdRSWWoCrRQ19ovAdY4gEXnSuj61cEelMmiQd0RddcnpNMNHIxB3SBN4+9EjtmVkT6BDePmpmxwHmMy56CdaS/S1klQ4PT4Gz1xfb9kNI8MQ+N6jDYGRDy73vNQoSRvMwGKhLoTL0NKzlCCR6oUZJR+Ciog8UXCPgVKtY4iB+zZKa+q3J6OtiWbRMFRHaqS0a3II7PY9gwibnAkWSCFx0jYwFULICEYTCgVhX40SW4YqZBRDef2DLc/ffYmyeYgPQl48xcXxTf56t6Q2R2AFeayDHlco8gkrfuh+NUayGQML+uBUSWx7oV2tKLUlyIHyHPCKqhJCwlDGUpFiSKNghqqSRCEogQY3e9Jc2sUZtGfkbeXe228xHlV2ccHFJDJJIbmD6Meh8tHVZjYCCMWdHBIP8lrs/Y3/8Ve/wdX1gAeljUectjtuLltePXuOjCClx2qhz8ZbD65wEZZNQyvOjZMVwZ2mOn3twQK1VhLCH/zud/jt3/4jajb++c//Y8KiZYwJbyNBoRRDPqFw/UQeJ3MjbzjrN9yq7jfXa9anN9jVwhQ7rktmJ3A1Fv767fe59877LFJDUEe0Moxb+mlPHTbs+2ssdEh3hDRLpgKqSq2zzDVRzFfgR2y2E8cSafd7FtPO1TI1JuqHXBDMivMTtIqztB0/scKt3xEz5Drx8su3+O4b3wGWjBJ4qx9JKbEbRk7ahrEWjlrhdLXkzvpzs3HoBGkX/Pbvf4NRF1TCDCkdwKBU451+g9WIeOGPv/0ar37un3HcCLfXHfe0417vhI+R4d9gFXcHdyZX3twP1FyJYUFMLaun7rBYfAeswd0IdSRFITSCrBdsmyW1jvh2YDkZufTk23dYr9dcmUITCQJmRhMVLzBOhSZEAgFrK/GFO2yPTyjDjt12YiOZIPETcRE/UjTgIgxhyX2PUtsWsURXK2dpSdMded1mpGRSitzq1pwsFnz/vQ+4eHSF1sxClC/dfZ7tsOfbf/k6Ht5EQoO6c2O1wEsFrwxWaFPDWhN1HOkWys3n7vDuJDLmRNHI5M0BIZ/C4x+hRY0MFkErKk4vE1caaM+eotgj0q7ShsTahTwOBIONBDS29GVifec2V+9ds32UkGykCrfaBe0YKQWsiWStIJVMRtrKc698luWzL8ojb7AYsQTUQJCCO58OFZFZrJtnpEAIATPHNbGtA5/56c8L+57h8srf+ub3yHnEsnOnhVXOZCZSBzeOImV/SvODN3nqaMkXnj4jmPLt984pMeEEXODzP/EKL7zyoqgqxMAewdyJKeGlEMQRlIp9xER8sqx1xxQ0HBy+Qj185+rIccO6uy3+59/1akpV6GLDC7eOqVEolnn08JJWV5wtO26sWtpVg/cTrea5mVTHVBmscB1BENQECYrGyFjLwQIamH1MGf5YOhSblZiIoKo0MR6cUUCCkjEqEdEGiR0SE41GrO8Zd3um7ITY0qW5jW+qc9VPqEaiQNLZqOz7TNBEDAGVOcoo0zSLuqBUK6jKJyYoH1vxIIK6ogjmc5Po71/4QkUqTlVjsVixqxkvsJ8qOQ88fXRMSi0fnD/ienePRVzSpgXZnL986wFHrnTNCrVKMaPuK9cPrvDzHWaOleoSFBaNHJ8cM9SJoEopBQnxbyOyANUfpVou/NXX/pSV4SICSWi6JVGE6oVm1bK52PHedstwfc1iccwiNXipmE0oSs2Ga8M+V4Y6ImrcXDccH624+M733UulTpmiMK6S/4N/+nMyOrMBifpJpPLxwu3gGu0gxpIKZobXQ8cbjRiMO6sVBKW0ge3lBY92e1JqWcaW0yYSu0jBEQmc769YdGse7ffs8sSicV556Q7FMg8f9bPWsVmThNBRa0VSYjpEdkH8SZL1qRifn8AR5q6Va8FFcRSNzezSD/TpJYM5poF9rWymEdPAZHUWa4f4LZfCmMuMc225ut6yG3q2Y0+xSnHDvTIMe8yMnPNcNGFO1f5/nVMAtVnViQPqmBVoF+RSIRtWCtua5xtgLNOCwZ3BCuKBe9sdok6wioTA6IKaMVTDbE6yrvPsqDQkikGjM/RKKfT9Dl0ukWI0qSHXyt+s/ZMdEE5UwdwwKhaVoWbUnCYmrBiTQTSl05ZaC40IU62UMvHGZos/zh1VOGo7TlYLHlyfoyFgOXFx3eMqdHEuwlXZ9T0Xw8TF5trXq6WEIIzTDo1hbkIf9pyPsfM4O6wuBIfilaZJDHnkF37ll2Sdhe/8ybf80TsPZiGvgVoyIVRinNXbummRGLncDNB0WBnodMlSl3Q1cvf4Di4QgjNNE9WUqQ6UpHzx732JVxaJsVHJIohC4bGHFYLMYdJjw/wx8Dxp/ebUKZPc8Wqzfg6KeJ0hJRCiUr1AqLhAlIBXI8gcJCUNBAJeC/3+kigT4gNT7sGNRYpYyVDL/GatQqm0QdFa0A/1k0/E+JMphAi4YVaIUyFfbzy5sbm+JpuwLMbzN2/Q42y22znV6pznX3iKMgV+8Ma7xJB47uYJeMDKgiiKyp4Xv3Cb9VFESNx/f8/bbz4gSuJm1xJC4Pz1t+htJKTWQ4o0yzVTTNy6e1dKG55Q9I8ckHyIBg8MEFQYPnjomx++h8TIQgVFWOZKCUqZhnkTi9C0zjMvLLm+GmnemaBUVs2KqZ8QDYw5I01g1295+dXniKKsmjX3371iHPa8+sIziDvj2LMICS1CGUbYFHJKxDvPQlKyOA5PAudoHzIQcuBw1Cl5JAah6zqwPAuwEFATGu2Ie6PWkVAdHzNSJ6JMdKsFkidWKWEysVxGrvsr8riAoVK9YpNTspGlMoVKRElhVoVShaUuEVM2/QaTQvCIoxjO4zAuigi1HpLtaixSg/QDw1TZ7vZ8sN0hMjcfp87NQRMhBIIGNPesQuDWM7f43Et3UIm89od/wcN3Lnn62Rv83S99kYmBcd+z31R21z3f/NbbSHOCmjOZ0w89OWdCk7A8h6VNSBCFNihBlCLC4DCZEWOcMR5CQM2QqHxw754vM+zOL5FipLbDqUQNmCkSAkJEPFOmzMnRmjoJY6isjhaYF5Ce2GUWK0gNXF31RBaUYqS0pGmvuOwzJsY0ZMQgpRYXIcaAGuRxonqg9qNfPbxk78btuy+IqVBKmVcccfQwQfjBd/+Ko8FZa8Ac+rF/olumaWIqGUVYtR0xdmyvnN/7P99lV/Z0xxNnt5f8/D/5Oxytl0gTsSL8j//+OyyXd2jCGlxJKdE0HVOdePfh5fzGRQ46vHLrxgkSA1YKr//ptzAzrvLEMy88T18NRFAzw8wQq0RRjpcrWgmICSKBLEJBMIkUiUwayRrR0FIJWHC8G7lxpyXT88MP7nFyo2G1HGjSiHsmNIGRnpogB8iPJ3kaqLHBUoc0S4xIRcgO1SChrD1yRGKpCTV/ksNHdG44IUMblLPlKZcXPQVhKIXNNBDEqaJPhqWKzg8LbKdH/Pv/9K9Zdw2/85tf5eTkBuujpwm+53vfeoe//NZX+Y//4Vc5Wt/kf//mV3nzrfuI3JhjiRSwMuIBigkalT4XyvaKs/URViASKTax6laU6kyhoCEQay6kGHntD//IGTJxqqxipBbHVGb8O5g+5vrZsVQxqJVcy+xYtj3X59fsLkaWC6VOW/78z96kSYm+77H8CHEjimAiBAlMNYNXcD3E0cKYJ0qBslyiGsi1YBowgfPzc1/efVrGaSKmEIgou82O1gR1YaxGRKki2GEmpP4j2jRxLM3dVOMxf/L1d0njxILb2GT81TfvM7rQtM+gYnz/B1tWa+FyH5lkSdQElulwijaYC25Cniq1OKujFcSEO1RVppzpdz1cXtLeuYWiREUgz3rYqjEVYwKoRlGdAxzm+U/FD3NJI3pLii2ugd//8re5tVpwZ3lMEmW7N/Y5kDojpcTvfuV7tIsFbYi0izXqxjIuqEG4uNoxlUKeHFJAQsN+KnCxQTzThUQpRhXlpguNCR6UqMVoJdKFxDT2eJmtRK2VKsKA4bFDY6B4wTB8KoQmoQ6JhhtHp0xl4ofbLSkFTAW6FaVsISi3bp4RQqCfRh5tr7l1dpshF1wie6lk6twd3RENeK0MNvLKc8/iVtjterLDcdOQcgUR4rDbU7NRciaFSNcmmqS0bctunHjv/AEXm2tiE5AYuPvZF4gC995+j6hKGva89NxtduPE9+69SxXBo9B4ppOJp5pI0oJ5YbPbcv/igim13Ow68rCHGHj5s5/l4fkF799/gBcjBiHnTAyB46M12+0WMbi+eMSuTD56JX7z63/i9XrPcdtRp8yibVkvEiEI60XHm+/fY1QYNaBq/NTP/n157ctfcadlLAW1yn6zIRyd0MeOEphJzTJTHllNmWWaHVVqI+16yaP9wFCgaQJ37z7LZ159WeL77/m98/cOQ65ACAGphetH5yy7BRoD9XrL1aMLdpaJUo1gRjmEmMO4hyocH60oU+bFF1/kH/3yLwtti4shdaQOEy+enjHVgk07pnFk8A2LkHAqz95Y05pQdUXXLLje9CjKUduyaBKDBC62mc1ugn4iufPcc8/I2TP/kiCR0o8MDy99+/ZblGmCpmEcRzpXFhKZvBC9VqIL61XHOI7EFCkUppyJmlisVvRm1JwpZULyjvVqgY6XNI0wO8vEsM8sakGscqYRd3AxmAqdKuRKc9DcbTCyDyxTYv/ogte+/Ht+9vm7PPvSi5LzRFo2nJceVJGgTLUQQ4LJUIRGEjqbAmEcR1QVmEWM+6wJVJWpjIzjPKbOQ8ZsHnC5CBqFFFsWbTcf8RCn+OGAjESqO10MaIBiIClhBkeLjmUKSJ3f9tvff4NwYLExD8QYyblSfT7oc6D5J/lmhJnmpFHMnSDKmI3c71kfr7h9+5Sv/+FXvNaAFefdN9+mUeHOySlSemoQ2gIEZSsTWSqrbHxw/oAqkaZMfOHZOxCFexc7TJUoLQ2VqJVKwsyZdhP7q56333/Xc8585ubT3N/1ZK14hOOTNePlbjYU4jOPq4NqxKwg5pRSyJaJ7pyuj+i2IzEsqAjvibCnos3M6S7OECB7YTLBPdCTmFKDRwjj7PJjWlF8w1TBYiVbRoHgI1KNL778eT744bseguAC49gjjeJmeK0cr9Y8vNpTSoWDwZ4DH/f55JTMA9kUEw/uX3D+5T/gxo0TJAjZhCgRiw33LnpqLqg4qtAKvHT21CHHMx6WHSaJEpSNC2XokaYhuTO6U1BqNYIoCeHy/JLm5JjVIrG52vHuW+/TpY6hVJTEW/feIxqklMh1JFa3uagQZtvmENqOWo2uWzBNI+JKMWOqNh8ck0QumSpKg5K6hlB66tUVwY3rvOdU4WS5oiC88+ADmuWKGIUkAet7+jGjIUGeIEX2+z3XZvzwjYecro5YpQVjhSxxPiLlQiOKS2A0J+ZaKNPE7uICd6cNkVXTMeQyO40YiapUmU9FlMcTRRc0NlArdhj/PXX7FDHjtL1FnTJPn9xkcHi4+T4hzAlt9UJIikyzD5jPsDhTLWyGPX2pNFZpVPEmMg2VGASp4LUy1cpuHIiTOJOXw0EBCMgct6kzlhGojA1Y01B6Q4Og1ZioVDOCBmLbkNwYMUKAYpV+6Nk31wwuqBhYwYMeDuIEulUHwLJrZqjuerI2nJeRq51RuiX9+Ya06A4mXpgvnplKJZo7LnM+rQ5RFKzy/EvP03QB6ZRwvGQswg++/qecpMjtdsnW9xSEUpxFExFreW+zw3xWfDo5t04Vk1kUmYDYvPGcQBvn0wljznMy4EIiENuW4sb5xSNOF2uaChJnv2s2B/21VmJKicmH2fEgUCoZ4/SZE3QRKJJRiZRxIl9vWMiSqd+hTSAIOInWEqXmmXMP0jeYIuM8yUAFJyI+DwhMZmmsQaglU2rhOHYQIik0LGKkrUajQpI5b3wcS4wlk/NEnEqmH/esQkeUgBJwEfb7PYtujaaG83cekqSh0TBLX4SpGLnOOJ0PQyqqjuP4PEhimia8bQ5ZjRJMDid8/EODhHnjV5tIKdCGCD5/7xi1Gio+nzZ1o6+ZyQrxX/zbX5E4Vb7/9T/zuuuplztGr1yfbzi+dVuGIfv7bz2g8cTp4galOg83V1hsCOIEMkVGVOdTn+pgIoyaKXFBEQdVDi/7kJY56jZn4lY51sid0xszjAaZj/rh3H3hWV797EtcPLjP6z94kwe7Lf/q135V+pqJY57QmNh65Wq7ARsJy45Xn38OcSV6II8FpswyJmp0Lnye98vjw2kq5FqJqvN0THT2pRWqVYIrxTJOxA95oKtQ3IiuaJTZvIhQxXEz2hC5utrw+ptvsL/esBtG+jwylUy1ivznX/+vJA10GsnjxCJFtA184w++5n/xzW8SNPHU6U2WEsEdUeVy7Ol9nlTUmkGMrut+NCd1hZJZBaW6YIvET//sz/C1177Bfruj0zgHTALJhTaFOYazwvnDR7QpcXZ8g1wGNsOWu599iZ/7+V+QyQq7Uogp8f8ANw117PIiliwAAAAASUVORK5CYII=",
  enemy_reddevil:
    "data:image/png;base64,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",
  enemy_skullhorn:
    "data:image/png;base64,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",
  enemy_smallred:
    "data:image/png;base64,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",
  enemy_stand:
    "data:image/png;base64,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",
  enemy_sword:
    "data:image/png;base64,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",
  enemy_trident:
    "data:image/png;base64,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",
  fire_female:
    "data:image/png;base64,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",
  pain_purple:
    "data:image/png;base64,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",
  pain_scythe:
    "data:image/png;base64,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",
};

// Merge second set into spriteImgs
(function loadSprites2() {
  const keys = Object.keys(SPRITE2_B64);
  let loaded = 0;
  const total = keys.length;
  keys.forEach((k) => {
    const img = new Image();
    img.onload = () => {
      loaded++;
      if (loaded === total) spritesReady = true;
    };
    img.src = SPRITE2_B64[k];
    spriteImgs[k] = img;
  });
})();

// Improved mapping for remaining units
function getCustomSprite(o) {
  // Player & main summons (first sheet)
  if (o === P || o.isPlayer) return "player";
  if (!o) return null;

  // Main summons
  if (o.type === "deacons") return "redhood";
  if (o.type === "ludwig") return "bearded";
  if (o.type === "gael") return "redblack";
  if (o.type === "cinder") return "purplegold";
  if (o.type === "rennala") return "bluegirl";
  if (o.type === "midir") return "dragon";
  if (o.type === "nagato") return "darkhood";

  // Beasts - use distinct ones
  if (o.type === "beast") {
    const n = (o.beastName || "").toUpperCase();
    if (n === "DOG") return "beast_dog";
    if (n === "CHAMELEON") return "beast_dino";
    if (n === "RHINO") return "beast_rhino";
    if (n === "BIRD") return "beast_bird";
    if (n === "PANDA") return "beast_panda1";
    return "beast_dog";
  }

  // Six Paths of Pain - distinct
  if (o.type === "pain") {
    const p = o.painType || "";
    if (p === "DEVA") return "enemy_firecrown";
    if (p === "ASURA") return "enemy_axe";
    if (p === "HUMAN") return "pain_purple";
    if (p === "ANIMAL") return "beast_trex";
    if (p === "PRETA") return "enemy_blackarmor";
    if (p === "NARAKA") return "pain_scythe";
    return "pain_purple";
  }

  // Converted - give them a unique look
  if (o.type === "converted") return "enemy_purple";

  // Mini-bosses
  if (o.isMiniBoss) {
    if (o.pattern === "slam") return "boss_horned"; // Iron Warden
    return "enemy_reddevil"; // Blood Executioner
  }

  // Bosses - spread unique sprites
  if (o.isBoss) {
    const t = o.t || "";
    if (t === "bishop") return "boss_crowned";
    if (t === "paladin") return "boss_horned";
    if (t === "mage") return "enemy_fireskull";
    if (t === "dragon") return "boss_redlarge";
    if (t === "demon") return "boss_muscle";
    if (t === "void") return "boss_black";
    if (t === "golem") return "boss_black";
    if (t === "reaper") return "pain_scythe";
    if (t === "seraph") return "boss_winged";
    if (t === "titan") return "boss_muscle";
    if (t === "tempest") return "cinder_like";
    if (t === "eclipse") return "boss_crowned";
    return "boss_redlarge";
  }

  // Regular enemies by variant - use as many unique skins as possible
  if (o.variant) {
    const v = o.variant;
    if (v === "normal") return "enemy_normal1";
    if (v === "speedster") return "enemy_smallred";
    if (v === "tank") return "enemy_bull";
    if (v === "shooter") return "enemy_trident";
    if (v === "splitter") return "enemy_axe";
    if (v === "healer") return "fire_female";
    if (v === "berserker") return "enemy_horns";
    if (v === "bomber") return "enemy_fireskull";
    if (v === "sniper") return "enemy_blacksword";
    if (v === "necro") return "enemy_cloak";
    if (v === "miniboss") return "boss_horned";
    return "enemy_stand";
  }

  return null;
}

const OH = {
  bluegirl: 90,
  beast_bird: 85,
  beast_trex: 95,
  bearded: 90,
  boss_crowned: 110,
  purplegold: 90,
  redhood: 90,
  enemy_axe: 85,
  enemy_blackarmor: 85,
  fire_female: 85,
  beast_panda2: 85,
  boss_redlarge: 110,
  enemy_blacksword: 85,
  cinder_like: 85,
  enemy_female: 85,
  enemy_firecrown: 85,
  dragon: 140,
  boss_black: 110,
  enemy_trident: 85,
  player: 90,
  enemy_sword: 85,
  enemy_stand: 85,
  enemy_smallred: 85,
  enemy_red: 85,
  beast_panda1: 85,
  boss_horned: 110,
  redblack: 90,
  pain_scythe: 85,
  boss_muscle: 110,
  beast_dino: 95,
  boss_winged: 110,
  darkhood: 90,
  enemy_purple: 85,
  beast_rhino: 95,
  enemy_cloak: 85,
  enemy_normal1: 85,
  beast_dog: 85,
  enemy_horns: 85,
  enemy_skullhorn: 85,
  pain_purple: 85,
  enemy_fireskull: 85,
  enemy_bull: 85,
  enemy_reddevil: 85,
};
function drawCustom(o, r) {
  const key = getCustomSprite(o);
  if (!key || !spriteImgs[key] || !spriteImgs[key].complete) {
    // Fallback to old procedural sprites
    if (o === P) drawSpr(o, PSPEC, r);
    else if (
      o.type === "deacons" ||
      o.type === "ludwig" ||
      o.type === "gael" ||
      o.type === "cinder" ||
      o.type === "rennala" ||
      o.type === "midir" ||
      o.type === "nagato" ||
      o.type === "beast" ||
      o.type === "pain" ||
      o.type === "converted"
    ) {
      drawSpr(o, mSpec(o), r);
    } else {
      drawSpr(o, eSpec(o), r);
    }
    return;
  }
  const img = spriteImgs[key];
  const dx = o.x - (o._lx === undefined ? o.x : o._lx);
  if (dx < -0.2) o._f = 1;
  else if (dx > 0.2) o._f = 0;
  o._lx = o.x;

  let targetH = Math.max(36, Math.round(r * 2.6));
  if (key.startsWith("boss_") || key === "dragon")
    targetH = Math.max(64, Math.round(r * 3.1));
  if (key.startsWith("beast_")) targetH = Math.max(42, Math.round(r * 2.9));
  const scale = targetH / (OH[key] || img.height);
  const w = img.width * scale,
    h = img.height * scale;
  o._top = h - targetH * 0.28; // pixels above o.y (for bars / labels)
  ctx.save();
  ctx.translate(o.x, o.y);
  if (o._f) ctx.scale(-1, 1);
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(img, -w / 2, targetH * 0.28 - h, w, h); // feet sit on the ground point
  ctx.restore();
}

// Mapping from unit type / phase to sprite key

const PSPEC = ["HUM", "#6a0dad", "#f59e0b", "#fde047"];
const ESP = {
  normal: ["DEM", "#e63946", "#fde68a", "#ffffff"],
  speedster: ["BST", "#38bdf8", "#e0f2fe", "#ffffff"],
  tank: ["GLM", "#94a3b8", "#475569", "#fde047"],
  shooter: ["HUM", "#a3e635", "#3f6212", "#ffffff"],
  splitter: ["DEM", "#f97316", "#fde047", "#ffffff"],
  healer: ["HUM", "#4ade80", "#ffffff", "#14532d"],
  berserker: ["DEM", "#fb7185", "#7f1d1d", "#fde047"],
  bomber: ["SKL", "#f43f5e", "#fde047", "#ef4444"],
  sniper: ["HUM", "#c084fc", "#1e1b4b", "#ef4444"],
  necro: ["SKL", "#a855f7", "#e9d5ff", "#a3e635"],
};
const BSP = {
  bishop: ["HUM", "#f8fafc", "#fde047", "#ef4444"],
  paladin: ["GLM", "#f59e0b", "#fef3c7", "#ffffff"],
  mage: ["HUM", "#eab308", "#7e22ce", "#7e22ce"],
  dragon: ["DRG", "#ef4444", "#7f1d1d", "#fde047"],
  demon: ["DEM", "#a855f7", "#fde047", "#ffffff"],
  void: ["EYE", "#8b5cf6", "#1e1b4b", "#e9d5ff"],
  golem: ["GLM", "#78716c", "#a8a29e", "#ef4444"],
  reaper: ["SKL", "#374151", "#9ca3af", "#ef4444"],
  seraph: ["DRG", "#fde68a", "#ffffff", "#7c3aed"],
  titan: ["DEM", "#b91c1c", "#fbbf24", "#fde047"],
  tempest: ["EYE", "#38bdf8", "#e0f2fe", "#1d4ed8"],
  eclipse: ["EYE", "#6d28d9", "#fde047", "#fde047"],
};
const eSpec = (e) =>
  e.isBoss
    ? BSP[e.t]
    : e.isMiniBoss
      ? e.pattern === "slam"
        ? ["GLM", "#f59e0b", "#7c2d12", "#ef4444"]
        : ["HUM", "#dc2626", "#111827", "#fde047"]
      : ESP[e.variant] || ESP.normal;
const BTPL = {
  DOG: "BST",
  CHAMELEON: "BST",
  RHINO: "GLM",
  BIRD: "DRG",
  PANDA: "BST",
};
function mSpec(m) {
  switch (m.type) {
    case "deacons":
      return ["HUM", "#f59e0b", "#ffffff", "#7c2d12"];
    case "ludwig":
      return m.phase2
        ? ["HUM", "#fde047", "#ffffff", "#b45309"]
        : ["BST", "#eab308", "#78350f", "#ffffff"];
    case "gael":
      return m.phase === 3
        ? ["SKL", "#7e22ce", "#38bdf8", "#38bdf8"]
        : m.phase === 2
          ? ["HUM", "#b91c1c", "#fde047", "#fde047"]
          : ["BST", "#dc2626", "#450a0a", "#fde047"];
    case "cinder":
      return m.p2
        ? ["HUM", "#fde047", "#ef4444", "#ef4444"]
        : ["HUM", "#f97316", "#451a03", "#fde047"];
    case "rennala":
      return ["HUM", "#93c5fd", "#e0e7ff", "#1d4ed8"];
    case "midir":
      return m.enraged
        ? ["DRG", "#4c1d95", "#ef4444", "#38bdf8"]
        : ["DRG", "#6d28d9", "#4c1d95", "#ef4444"];
    case "nagato":
      return m.gedoActive
        ? ["HUM", "#a855f7", "#111827", "#ffffff"]
        : ["HUM", "#dc2626", "#111827", "#c084fc"];
    case "beast":
      return [BTPL[m.beastName] || "BST", m.color, "#111827", "#111827"];
    case "pain":
      return [
        m.painType === "ANIMAL"
          ? "BST"
          : m.painType === "PRETA"
            ? "GLM"
            : m.painType === "NARAKA"
              ? "SKL"
              : "HUM",
        m.color,
        "#111827",
        "#ffffff",
      ];
    default:
      return ["DEM", m.color || "#f59e0b", "#fde047", "#ffffff"];
  }
}

// ============ DRAW ============

// ============ PIXEL FX RENDERER (4px low-res layers, no glow) ============
const PX = 4,
  LW = W / PX,
  LH = H / PX;
const fxU = document.createElement("canvas"),
  fxO = document.createElement("canvas");
fxU.width = fxO.width = LW;
fxU.height = fxO.height = LH;
const gU = fxU.getContext("2d"),
  gO = fxO.getContext("2d");
const stp = (k) => (k > 0.66 ? 1 : k > 0.33 ? 0.7 : 0.4);
const rc = (g, x, y, w, h, c, a = 1) => {
  g.globalAlpha = a;
  g.fillStyle = c;
  g.fillRect(Math.round(x), Math.round(y), w, h);
};
function disc(g, cx, cy, r, c, a = 1) {
  cx = Math.round(cx);
  cy = Math.round(cy);
  r = Math.round(r);
  if (r < 1) {
    rc(g, cx, cy, 1, 1, c, a);
    return;
  }
  g.globalAlpha = a;
  g.fillStyle = c;
  for (let y = -r; y <= r; y++) {
    const w = Math.floor(Math.sqrt(r * r - y * y + r * 0.5));
    g.fillRect(cx - w, cy + y, w * 2 + 1, 1);
  }
}
function ringP(g, cx, cy, r, t, c, a = 1) {
  cx = Math.round(cx);
  cy = Math.round(cy);
  r = Math.round(r);
  if (r < 2) {
    disc(g, cx, cy, r, c, a);
    return;
  }
  g.globalAlpha = a;
  g.fillStyle = c;
  const ri = Math.max(0, r - t);
  for (let y = -r; y <= r; y++) {
    const wo = Math.floor(Math.sqrt(r * r - y * y + r * 0.5));
    if (Math.abs(y) < ri) {
      const wi = Math.floor(Math.sqrt(ri * ri - y * y + ri * 0.5));
      g.fillRect(cx - wo, cy + y, wo - wi, 1);
      g.fillRect(cx + wi + 1, cy + y, wo - wi, 1);
    } else g.fillRect(cx - wo, cy + y, wo * 2 + 1, 1);
  }
}
function lineP(g, x0, y0, x1, y1, t, c, a = 1) {
  const dx = x1 - x0,
    dy = y1 - y0,
    n = Math.max(1, Math.ceil(Math.max(Math.abs(dx), Math.abs(dy))));
  g.globalAlpha = a;
  g.fillStyle = c;
  const o = t / 2;
  for (let i = 0; i <= n; i++)
    g.fillRect(
      Math.round(x0 + (dx * i) / n - o),
      Math.round(y0 + (dy * i) / n - o),
      t,
      t,
    );
}
const auraCol = (m) =>
  m.type === "nagato"
    ? m.gedoActive
      ? "#c084fc"
      : "#ef4444"
    : m.type === "cinder"
      ? m.p2
        ? "#fde047"
        : "#f97316"
      : m.type === "midir"
        ? m.enraged
          ? "#ef4444"
          : "#8b5cf6"
        : m.type === "gael"
          ? m.phase === 3
            ? "#c084fc"
            : m.phase === 2
              ? "#ef4444"
              : "#dc2626"
          : m.type === "ludwig"
            ? m.phase2
              ? "#fde047"
              : "#eab308"
            : m.type === "rennala"
              ? m.phase2
                ? "#e0e7ff"
                : "#93c5fd"
              : null;
const fillCol = (m) =>
  m.type === "deacons"
    ? ["#f59e0b", 0.08]
    : m.type === "ludwig"
      ? m.phase2
        ? ["#fef08a", 0.22]
        : ["#dc2626", 0.14]
      : m.type === "gael"
        ? m.phase === 3
          ? ["#7e22ce", 0.3]
          : m.phase === 2
            ? ["#b91c1c", 0.22]
            : ["#dc2626", 0.14]
        : m.type === "cinder"
          ? m.p2
            ? ["#fde047", 0.25]
            : ["#f97316", 0.12]
          : m.type === "rennala"
            ? m.phase2
              ? ["#e0e7ff", 0.28]
              : ["#93c5fd", 0.14]
            : m.type === "midir"
              ? m.enraged
                ? ["#6d28d9", 0.35]
                : ["#4c1d95", 0.22]
              : m.type === "nagato"
                ? ["#dc2626", 0.15]
                : m.type === "pain" && m.painType === "PRETA"
                  ? ["#38bdf8", 0.14]
                  : null;

function drawFx(g, f) {
  const lx = f.x / PX,
    ly = f.y / PX,
    rad = f.radius / PX,
    k = Math.max(0, f.life / f.maxLife),
    t = 1 - k,
    a = stp(k),
    c = f.color,
    ang = f.angle || 0;
  switch (f.kind) {
    case "slash":
    case "beam":
      return; // drawn from Sl / Bm
    case "meleeTell": {
      const r = rad * (0.82 + 0.18 * t),
        span = f.span || 1.05,
        steps = 22;
      // outlined attack sector with bright edge and a clear forward axis
      for (let i = 0; i <= steps; i++) {
        const q = ang - span + (2 * span * i) / steps,
          ex = lx + Math.cos(q) * r,
          ey = ly + Math.sin(q) * r;
        rc(g, ex, ey, 2, 2, c, a * 0.95);
        if (i % 3 === 0)
          rc(
            g,
            lx + Math.cos(q) * r * 0.72,
            ly + Math.sin(q) * r * 0.72,
            1,
            1,
            "#ffffff",
            a * 0.8,
          );
      }
      lineP(
        g,
        lx,
        ly,
        lx + Math.cos(ang) * r,
        ly + Math.sin(ang) * r,
        2,
        "#ffffff",
        a * 0.9,
      );
      ringP(g, lx, ly, r * 0.28, 1, c, a * 0.7);
      break;
    }
    case "meleeBurst": {
      const r = rad * (0.42 + 0.58 * t);
      ringP(g, lx, ly, r, 3, c, a);
      ringP(g, lx, ly, r * 0.78, 1, "#ffffff", a * 0.85);
      for (let i = 0; i < 12; i++) {
        const q = (i / 12) * CROSS + drawFrame * 0.025;
        lineP(
          g,
          lx + Math.cos(q) * r * 0.72,
          ly + Math.sin(q) * r * 0.72,
          lx + Math.cos(q) * r * 1.08,
          ly + Math.sin(q) * r * 1.08,
          2,
          c,
          a,
        );
      }
      break;
    }
    case "flash": {
      const r = rad * (0.25 + t * 0.9) * 0.9;
      disc(g, lx, ly, r, c, a * 0.8);
      disc(g, lx, ly, r * 0.5, "#ffffff", a);
      break;
    }
    case "nova": {
      const r = rad * (0.18 + t * 0.82);
      disc(g, lx, ly, r * 0.7, c, a * 0.22);
      ringP(g, lx, ly, r, 2, c, a);
      const o = Math.floor(drawFrame / 4) * 0.25;
      for (let i = 0; i < 8; i++) {
        const q = (i * Math.PI) / 4 + o;
        lineP(
          g,
          lx + Math.cos(q) * r * 0.55,
          ly + Math.sin(q) * r * 0.55,
          lx + Math.cos(q) * r * 0.98,
          ly + Math.sin(q) * r * 0.98,
          1,
          "#ffffff",
          a,
        );
      }
      break;
    }
    case "aura": {
      const r = rad * (0.82 + Math.sin(drawFrame * 0.24) * 0.08),
        o = Math.floor(drawFrame / 6);
      disc(g, lx, ly, r, c, 0.1);
      for (let i = 0; i < 20; i++)
        if ((i + o) % 2 === 0) {
          const q = (i / 20) * CROSS;
          rc(
            g,
            lx + Math.cos(q) * r - 1,
            ly + Math.sin(q) * r - 1,
            2,
            2,
            c,
            0.9,
          );
        }
      break;
    }
    default: {
      const r = rad * (0.18 + t * 0.9);
      ringP(g, lx, ly, r, 2, c, a);
      if (r > 5) ringP(g, lx, ly, r - 2, 1, "#ffffff", a * 0.7);
      if (f.kind === "gravity")
        for (let i = 0; i < 4; i++) {
          const q = (i * Math.PI) / 2 + drawFrame * 0.06;
          rc(
            g,
            lx + Math.cos(q) * r * 0.6 - 1,
            ly + Math.sin(q) * r * 0.6 - 1,
            2,
            2,
            c,
            a,
          );
        }
    }
  }
}
function drawBeam(g, b) {
  const a = Math.max(0.15, Math.min(1, b.life / (b.maxLife || 32))),
    w = b.width || 60,
    hw = (w * 0.62) / PX,
    lx = b.x / PX,
    ly = b.y / PX,
    ux = Math.cos(b.angle),
    uy = Math.sin(b.angle),
    L = 117;
  const col = b.cinder
    ? "#60a5fa"
    : b.ludwig || b.ludwigHoly
      ? "#fde047"
      : b.midir
        ? "#a78bfa"
        : "#f87171";
  const ex = lx + ux * L,
    ey = ly + uy * L;
  lineP(g, lx, ly, ex, ey, Math.max(3, Math.round(hw * 2)), col, 0.28 * a);
  lineP(g, lx, ly, ex, ey, Math.max(2, Math.round(hw * 1.1)), col, 0.8 * a);
  lineP(g, lx, ly, ex, ey, Math.max(1, Math.round(hw * 0.4)), "#ffffff", a);
  const o = Math.floor(drawFrame / 3);
  for (let i = 0; i < 10; i++) {
    const d = (i * 13 + o * 7) % L,
      off = (((i * 5 + o) % 5) - 2) * hw * 0.5;
    rc(
      g,
      lx + ux * d - uy * off,
      ly + uy * d + ux * off,
      2,
      2,
      "#ffffff",
      a * 0.9,
    );
  }
}
function drawBul(g, b, en) {
  const lx = b.x / PX,
    ly = b.y / PX,
    sp = Math.hypot(b.vx || 0, b.vy || 0) || 1,
    ux = (b.vx || 0) / sp,
    uy = (b.vy || 0) / sp,
    col = b.color || "#fff",
    r = Math.max(1, Math.round((b.r || 5) / PX));
  const tr = (n, c, st = 1.7) => {
    for (let i = 1; i <= n; i++) {
      const z = Math.max(1, r - (i > 1 ? 1 : 0));
      rc(
        g,
        lx - ux * i * st - z / 2,
        ly - uy * i * st - z / 2,
        z,
        z,
        c,
        1 - i / (n + 1),
      );
    }
  };
  if (b.gedo) {
    tr(7, "#7e22ce", 2);
    disc(g, lx, ly, r + 2, "#3b0764");
    ringP(g, lx, ly, r + 3, 1, "#c084fc");
    disc(g, lx, ly, Math.max(1, r - 1), "#f3e8ff");
  } else if (b.lightning || b.skyLightning) {
    const big = b.lightning,
      L = big ? 10 : 5,
      px_ = -uy,
      py_ = ux,
      o = (Math.floor(drawFrame / 2) % 2 ? 1 : -1) * (big ? 2 : 1);
    let x0 = lx,
      y0 = ly;
    for (let i = 1; i <= 3; i++) {
      const sg = i % 2 ? 1 : -1,
        x1 = lx - (ux * L * i) / 3 + px_ * o * sg,
        y1 = ly - (uy * L * i) / 3 + py_ * o * sg;
      lineP(g, x0, y0, x1, y1, big ? 2 : 1, "#fde047");
      if (big) lineP(g, x0, y0, x1, y1, 1, "#ffffff");
      x0 = x1;
      y0 = y1;
    }
    rc(g, lx - 1, ly - 1, big ? 3 : 2, big ? 3 : 2, "#ffffff");
  } else if (b.asuraMissile) {
    tr(4, "#ef4444");
    disc(g, lx, ly, r + 1, "#f97316");
    rc(g, lx, ly, 1, 1, "#fff7ed");
  } else if (b.lunarBolt) {
    tr(3, "#bfdbfe");
    disc(g, lx, ly, r + 1, "#93c5fd");
    ringP(g, lx, ly, r + 2, 1, "#e0f2fe");
  } else if (b.moonlight) {
    lineP(g, lx - ux * 6, ly - uy * 6, lx + ux * 2, ly + uy * 2, 2, "#fef08a");
    lineP(g, lx - ux * 5, ly - uy * 5, lx + ux, ly + uy, 1, "#ffffff");
  } else if (b.darkSkull || b.humanity) {
    tr(3, "#7e22ce");
    disc(g, lx, ly, r + 1, "#e9d5ff");
    rc(g, lx - 1, ly - 1, 1, 1, "#111827");
    rc(g, lx + 1, ly - 1, 1, 1, "#111827");
  } else if (en) {
    tr(4, col, 1.6);
    disc(g, lx, ly, r, col);
    rc(g, lx, ly, 1, 1, "#ffffff");
  } else {
    tr(3, col);
    disc(g, lx, ly, r, col);
    rc(g, lx, ly, 1, 1, "#ffffff");
  }
}

let drawFrame = 0;
function draw() {
  updateCamera();
  ctx.clearRect(0, 0, VIEW_W, VIEW_H);
  ctx.save();
  ctx.translate(-camX, -camY);
  ctx.drawImage(bgCanvas, 0, 0);
  ctx.strokeStyle = "#f59e0b";
  ctx.lineWidth = 4;
  ctx.strokeRect(2, 2, W - 4, H - 4);
  drawFrame++;
  gU.globalAlpha = 1;
  gU.clearRect(0, 0, LW, LH);
  gO.globalAlpha = 1;
  gO.clearRect(0, 0, LW, LH);

  // ---- ground layer: zones, auras, rings, beams
  for (const z of chibakuZones) {
    const a = Math.min(1, z.life / 120),
      lx = z.x / PX,
      ly = z.y / PX,
      r = z.radius / PX;
    disc(gU, lx, ly, r, "#111827", 0.45 * a);
    ringP(gU, lx, ly, r, 2, "#6d28d9", a);
    for (let i = 0; i < 8; i++) {
      const q = (i * Math.PI) / 4 + drawFrame * 0.05,
        d = r * (0.35 + (0.4 * ((i * 37 + drawFrame) % 60)) / 60);
      rc(gU, lx + Math.cos(q) * d, ly + Math.sin(q) * d, 2, 2, "#c4b5fd", a);
    }
  }
  if (boss && boss.hp > 0)
    ringP(gU, boss.x / PX, boss.y / PX, boss.buff / PX, 1, "#fde047", 0.3);
  for (const f of Fx) drawFx(gU, f);
  for (const b of Bm) drawBeam(gU, b);
  for (const m of M) {
    const fc = fillCol(m);
    if (fc)
      disc(
        gU,
        m.x / PX,
        m.y / PX,
        (m.type === "deacons" ? m.range : m.type === "midir" ? 200 : 150) / PX,
        fc[0],
        fc[1],
      );
    const ac = auraCol(m);
    if (ac) {
      const r = (m.r + 9 + Math.sin(drawFrame * 0.16) * 3) / PX;
      ringP(gU, m.x / PX, m.y / PX, r, 1, ac, 0.85);
      ringP(gU, m.x / PX, m.y / PX, r + 2, 1, ac, 0.35);
    }
  }
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(fxU, 0, 0, W, H);

  // ---- characters
  ctx.textAlign = "center";
  for (const e of E) {
    const big = e.isBoss || e.isMiniBoss;
    drawCustom(e, e.r);
    if (e.slowT > 0) ringP(gO, e.x / PX, e.y / PX, e.r / PX, 1, "#93c5fd", 0.9);
    const top = (e._top || e.r * 2) + 8,
      bw = e.isBoss ? 80 : e.isMiniBoss ? 54 : 32,
      bh = e.isBoss ? 6 : 5,
      by = e.y - top;
    if (big) {
      ctx.fillStyle = e.isBoss ? "#fde047" : "#f59e0b";
      ctx.font = "bold 12px Arial";
      ctx.fillText(e.name, e.x, by - 5);
    }
    ctx.fillStyle = "red";
    ctx.fillRect(e.x - bw / 2, by, bw, bh);
    ctx.fillStyle = e.isBoss ? "#fde047" : e.isMiniBoss ? "#f59e0b" : "lime";
    ctx.fillRect(e.x - bw / 2, by, bw * (e.hp / e.max), bh);
  }
  for (const m of M) {
    drawCustom(m, m.r);
    const by = m.y - (m._top || m.r * 2) - 8;
    const label =
      m.type === "ludwig"
        ? "LUDWIG"
        : m.type === "gael"
          ? "GAEL"
          : m.type === "cinder"
            ? m.p2
              ? "CINDER P2"
              : "CINDER"
            : m.type === "deacons"
              ? "DEACONS"
              : m.type === "converted"
                ? "CONVERTED"
                : m.type === "rennala"
                  ? m.phase2
                    ? "RENNALA P2"
                    : "RENNALA"
                  : m.type === "midir"
                    ? m.enraged
                      ? "MIDIR ENRAGED"
                      : "MIDIR"
                    : m.type === "nagato"
                      ? m.gedoActive
                        ? "GEDO"
                        : "NAGATO"
                      : m.type === "beast"
                        ? m.beastName || "BEAST"
                        : m.type === "pain"
                          ? m.painType
                          : null;
    if (label) {
      ctx.fillStyle = auraCol(m) || "#fde68a";
      ctx.font = "bold 10px Arial";
      ctx.fillText(label, m.x, by - 3);
    }
    ctx.fillStyle = "red";
    ctx.fillRect(m.x - 20, by, 40, 4);
    ctx.fillStyle =
      m.type === "gael" && m.phase === 3
        ? "#7e22ce"
        : m.type === "ludwig" && m.phase2
          ? "#fef08a"
          : m.type === "midir" && m.enraged
            ? "#ef4444"
            : "#38bdf8";
    ctx.fillRect(m.x - 20, by, 40 * (m.hp / m.max), 4);
  }
  drawCustom(P, P.r);

  // ---- overlay layer: slashes, particles, bullets
  for (const s of Sl) {
    const k = Math.max(0, s.life / (s.maxLife || 18)),
      a = stp(k),
      lx = s.x / PX,
      ly = s.y / PX;
    if (s.wide) {
      // Big Cinder-style sword sweep
      const rad = (s.rad || 180) / PX,
        sz = Math.max(2, Math.round(5 * k) + 1);
      for (let q = -1.1; q <= 1.1; q += 0.07) {
        const an = s.angle + q,
          rr = rad * (0.55 + 0.45 * k);
        rc(
          gO,
          lx + Math.cos(an) * rr - sz / 2,
          ly + Math.sin(an) * rr - sz / 2,
          sz,
          sz,
          s.c,
          a,
        );
        if (Math.abs(q) < 0.55)
          rc(
            gO,
            lx + Math.cos(an) * rr,
            ly + Math.sin(an) * rr,
            2,
            2,
            "#ffffff",
            a * 0.95,
          );
      }
      // inner bright edge
      for (let q = -0.7; q <= 0.7; q += 0.12) {
        const an = s.angle + q,
          rr = rad * 0.4;
        rc(
          gO,
          lx + Math.cos(an) * rr - 1,
          ly + Math.sin(an) * rr - 1,
          2,
          2,
          "#fff7ed",
          a,
        );
      }
    } else {
      // normal slash
      const sz = Math.max(1, Math.round(4 * k) + 1);
      for (let q = -1; q <= 1.001; q += 0.1) {
        const an = s.angle + q,
          rr = 15 + (1 - k) * 5;
        rc(
          gO,
          lx + Math.cos(an) * rr - sz / 2,
          ly + Math.sin(an) * rr - sz / 2,
          sz,
          sz,
          s.c,
          a,
        );
        if (Math.abs(q) < 0.7)
          rc(
            gO,
            lx + Math.cos(an) * rr,
            ly + Math.sin(an) * rr,
            1,
            1,
            "#ffffff",
            a,
          );
      }
    }
  }
  for (const b of B) drawBul(gO, b, false);
  for (const b of EB) drawBul(gO, b, true);
  for (const p of Pt) rc(gO, p.x / PX, p.y / PX, 1, 1, p.c, stp(p.life / 12));
  if (drawFrame % 3 === 0)
    for (const d of deadPainBodies) d.age = (d.age || 0) + 1;
  for (const d of deadPainBodies) {
    disc(
      gO,
      d.x / PX,
      d.y / PX,
      2,
      d.color,
      0.35 + Math.sin((d.age || 0) * 0.1) * 0.15,
    );
  }
  gO.globalAlpha = 1;
  ctx.drawImage(fxO, 0, 0, W, H);
  ctx.restore();
  if (paused) {
    ctx.save();
    ctx.fillStyle = "rgba(0,0,0,.16)";
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    ctx.restore();
  }
}
// Fixed 60 updates/sec regardless of monitor refresh rate
let lastT = performance.now(),
  acc = 0;
function loop(now) {
  acc += Math.min(100, now - lastT);
  lastT = now;
  while (acc >= 1000 / 60) {
    update();
    acc -= 1000 / 60;
  }
  draw();
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
