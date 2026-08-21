"use client";

import { useEffect, useRef } from "react";
import type { RealGameProps } from "../registry";
import { DEFAULT_SKIN, type SkinId } from "../skins";
import { FROGGER_SKINS, type FroggerSkin } from "./skins";

const CELL = 40;
const COLS = 20;
const ROWS = 15;
const W = COLS * CELL;
const H = ROWS * CELL;

const GOAL_ROW = 0;
const RIVER_ROWS = [1, 2, 3, 4, 5];
const SAFE_ROW = 6;
const ROAD_ROWS = [7, 8, 9, 10, 11];
const SPAWN_ROW = 12;

const LILYPAD_COLS = [2, 6, 10, 14, 18];

const FROG_HALF = 15;
const TURTLE_WIDTH_CELLS = 2;
const ROAD_VEHICLE_WIDTH_CELLS = [2, 1.5, 2.25, 1.75, 2.5];
const RIVER_LANE_MULT = [1, 1.35, 0.85, 1.5, 1.1];
const ROAD_LANE_MULT = [1, 1.4, 0.75, 1.6, 1.05];

const DIVE_CYCLE_MS = 5000;
const DIVE_SUBMERGED_MS = 1300;
const INFINITE_SPEED_STEP = 0.12;

const ROAD_DASH = [14, 10];
const NO_DASH: number[] = [];

const CONTROL_CODES = new Set([
  "ArrowLeft",
  "ArrowRight",
  "ArrowUp",
  "ArrowDown",
  "KeyW",
  "KeyA",
  "KeyS",
  "KeyD",
  "Space",
]);

const DIRECTION_BY_CODE: Record<string, { x: number; y: number }> = {
  ArrowLeft: { x: -1, y: 0 },
  KeyA: { x: -1, y: 0 },
  ArrowRight: { x: 1, y: 0 },
  KeyD: { x: 1, y: 0 },
  ArrowUp: { x: 0, y: -1 },
  KeyW: { x: 0, y: -1 },
  ArrowDown: { x: 0, y: 1 },
  KeyS: { x: 0, y: 1 },
};

interface LevelConfig {
  timeLimit: number;
  riverSpeed: number;
  roadSpeed: number;
  logLength: number;
  vehicleGap: number;
  turtlesDive: boolean;
}

const LEVELS: LevelConfig[] = [
  {
    timeLimit: 30,
    riverSpeed: 55,
    roadSpeed: 70,
    logLength: 3,
    vehicleGap: 3.2,
    turtlesDive: false,
  },
  {
    timeLimit: 28,
    riverSpeed: 65,
    roadSpeed: 85,
    logLength: 3,
    vehicleGap: 2.6,
    turtlesDive: false,
  },
  {
    timeLimit: 26,
    riverSpeed: 75,
    roadSpeed: 100,
    logLength: 2.5,
    vehicleGap: 2.2,
    turtlesDive: true,
  },
  {
    timeLimit: 24,
    riverSpeed: 85,
    roadSpeed: 115,
    logLength: 2,
    vehicleGap: 1.9,
    turtlesDive: true,
  },
  {
    timeLimit: 22,
    riverSpeed: 95,
    roadSpeed: 130,
    logLength: 2,
    vehicleGap: 1.6,
    turtlesDive: true,
  },
];

type LaneKind = "safe" | "goal" | "river" | "road";

interface Vehicle {
  x: number;
  width: number;
}

interface Platform {
  x: number;
  width: number;
  kind: "log" | "turtle";
  diveTimer: number;
  submerged: boolean;
}

interface Lane {
  row: number;
  kind: LaneKind;
  dir: 1 | -1;
  speed: number;
  gap: number;
  vehicles: Vehicle[];
  platforms: Platform[];
}

interface Frog {
  col: number;
  x: number;
  row: number;
  ridingLane: number | null;
  alive: boolean;
}

type GameState = "playing" | "gameover";

/**
 * Sprite de glow horneado una sola vez en un canvas offscreen: la forma se
 * dibuja con su shadowBlur/shadowColor reales activados, así el resultado es
 * pixel a pixel igual al de recalcular el blur cada frame. `anchorX`/`anchorY`
 * son el punto del sprite que corresponde al punto de referencia usado al
 * dibujar la forma real (esquina superior izquierda para rectángulos, centro
 * para elipses), para poder componerlo con drawImage sin ningún escalado.
 */
interface GlowSprite {
  canvas: HTMLCanvasElement;
  anchorX: number;
  anchorY: number;
}

interface GlowSpriteCache {
  logsByWidth: Map<number, GlowSprite>;
  turtle: GlowSprite;
  vehiclesByLane: GlowSprite[];
  lilypadFilled: GlowSprite;
  lilypadEmpty: GlowSprite;
  frog: GlowSprite;
}

function makeRectGlowSprite(
  w: number,
  h: number,
  radius: number,
  color: string,
  blur: number,
): GlowSprite {
  const pad = Math.ceil(blur * 2) + 4;
  const canvas = document.createElement("canvas");
  canvas.width = w + pad * 2;
  canvas.height = h + pad * 2;
  const c = canvas.getContext("2d")!;
  c.fillStyle = color;
  c.shadowColor = color;
  c.shadowBlur = blur;
  c.beginPath();
  c.roundRect(pad, pad, w, h, radius);
  c.fill();
  return { canvas, anchorX: pad, anchorY: pad };
}

function makeEllipseGlowSprite(
  rx: number,
  ry: number,
  color: string,
  blur: number,
  mode: "fill" | "stroke",
  lineWidth = 2,
): GlowSprite {
  const pad = Math.ceil(blur * 2) + 4 + (mode === "stroke" ? lineWidth : 0);
  const canvas = document.createElement("canvas");
  canvas.width = Math.ceil(rx * 2 + pad * 2);
  canvas.height = Math.ceil(ry * 2 + pad * 2);
  const c = canvas.getContext("2d")!;
  c.beginPath();
  c.ellipse(pad + rx, pad + ry, rx, ry, 0, 0, Math.PI * 2);
  c.shadowColor = color;
  c.shadowBlur = blur;
  if (mode === "fill") {
    c.fillStyle = color;
    c.fill();
  } else {
    c.strokeStyle = color;
    c.lineWidth = lineWidth;
    c.stroke();
  }
  return { canvas, anchorX: pad + rx, anchorY: pad + ry };
}

function buildGlowSprites(s: FroggerSkin): GlowSpriteCache | null {
  if (s.glowPlatform === 0 && s.glowVehicle === 0 && s.glowActor === 0) return null;
  const logsByWidth = new Map<number, GlowSprite>();
  for (const cfg of LEVELS) {
    const w = cfg.logLength * CELL;
    if (!logsByWidth.has(w)) {
      logsByWidth.set(w, makeRectGlowSprite(w, CELL - 12, 6, s.log, s.glowPlatform));
    }
  }
  const turtle = makeEllipseGlowSprite(
    (TURTLE_WIDTH_CELLS * CELL) / 2,
    CELL / 2 - 6,
    s.turtle,
    s.glowPlatform,
    "fill",
  );
  const vehiclesByLane = ROAD_VEHICLE_WIDTH_CELLS.map((cells, i) =>
    makeRectGlowSprite(
      cells * CELL,
      CELL - 16,
      5,
      s.vehicles[i % s.vehicles.length],
      s.glowVehicle,
    ),
  );
  const lilypadFilled = makeEllipseGlowSprite(15, 11, s.lilypad, s.glowActor, "fill");
  const lilypadEmpty = makeEllipseGlowSprite(15, 11, s.lilypad, s.glowPlatform, "stroke", 2);
  const frog = makeEllipseGlowSprite(15, 13, s.frog, s.glowActor, "fill");
  return { logsByWidth, turtle, vehiclesByLane, lilypadFilled, lilypadEmpty, frog };
}

export default function FroggerGame({ paused, skin, onStateChange, onGameOver }: RealGameProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pausedRef = useRef(paused);
  const skinRef = useRef<SkinId>(skin ?? DEFAULT_SKIN);
  const redrawRef = useRef<(() => void) | null>(null);
  const onStateChangeRef = useRef(onStateChange);
  const onGameOverRef = useRef(onGameOver);

  useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);
  useEffect(() => {
    skinRef.current = skin ?? DEFAULT_SKIN;
    // El bucle no dibuja mientras está en pausa o tras el game over,
    // así que el cambio de skin no se vería hasta reanudar.
    redrawRef.current?.();
  }, [skin]);
  useEffect(() => {
    onStateChangeRef.current = onStateChange;
  }, [onStateChange]);
  useEffect(() => {
    onGameOverRef.current = onGameOver;
  }, [onGameOver]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx2d = canvas.getContext("2d");
    if (!ctx2d) return;
    const ctx: CanvasRenderingContext2D = ctx2d;
    // Estado de texto constante en todo el juego: fijarlo una vez evita que
    // drawBottomStrip lo reescriba (y potencialmente reparsee la fuente) cada frame.
    ctx.font = "bold 12px monospace";
    ctx.textAlign = "left";
    ctx.textBaseline = "top";

    // Caché de sprites de glow horneados, indexada por la skin con la que se
    // construyó. Se reconstruye sola la primera vez que draw() ve una skin
    // distinta a la de la última construcción (init o cambio de skin vía
    // skinRef/redrawRef) — nunca useState, es una variable de closure más.
    let glowSprites: GlowSpriteCache | null = null;
    let glowSpritesSkin: SkinId | null = null;

    function ensureGlowSprites(): GlowSpriteCache | null {
      const currentSkin = skinRef.current;
      if (glowSpritesSkin === currentSkin) return glowSprites;
      glowSpritesSkin = currentSkin;
      glowSprites = buildGlowSprites(FROGGER_SKINS[currentSkin]);
      return glowSprites;
    }

    const lanes: Lane[] = new Array(ROWS);
    const lilypads = [false, false, false, false, false];
    const frog: Frog = { col: 0, x: 0, row: SPAWN_ROW, ridingLane: null, alive: true };
    const heldCodes = new Set<string>();

    let lives = 3;
    let score = 0;
    let level = 1;
    let maxRowReached = 0;
    let timeLeft = LEVELS[0].timeLimit;
    let gameState: GameState = "playing";
    let gameOverFired = false;
    let lastEmitted = { score: -1, level: -1, lives: -1 };

    function currentLevelConfig(): LevelConfig {
      const idx = Math.min(level - 1, LEVELS.length - 1);
      return LEVELS[idx];
    }

    function speedMultiplier() {
      return level > LEVELS.length ? 1 + INFINITE_SPEED_STEP * (level - LEVELS.length) : 1;
    }

    function buildRiverLane(row: number, i: number): Lane {
      const cfg = currentLevelConfig();
      const extra = speedMultiplier();
      const dir: 1 | -1 = i % 2 === 0 ? 1 : -1;
      const kind: "log" | "turtle" = i % 2 === 0 ? "log" : "turtle";
      const speed = cfg.riverSpeed * RIVER_LANE_MULT[i] * extra;
      const widthCells = kind === "log" ? cfg.logLength : TURTLE_WIDTH_CELLS;
      const width = widthCells * CELL;
      const gap = cfg.vehicleGap * CELL;
      const cycle = width + gap;
      const count = Math.ceil(W / cycle) + 2;
      const platforms: Platform[] = [];
      for (let k = 0; k < count; k++) {
        platforms.push({
          x: k * cycle,
          width,
          kind,
          diveTimer: kind === "turtle" ? (k * DIVE_CYCLE_MS) / count : 0,
          submerged: false,
        });
      }
      return { row, kind: "river", dir, speed, gap, vehicles: [], platforms };
    }

    function buildRoadLane(row: number, i: number): Lane {
      const cfg = currentLevelConfig();
      const extra = speedMultiplier();
      const dir: 1 | -1 = i % 2 === 0 ? -1 : 1;
      const speed = cfg.roadSpeed * ROAD_LANE_MULT[i] * extra;
      const width = ROAD_VEHICLE_WIDTH_CELLS[i] * CELL;
      const gap = cfg.vehicleGap * CELL;
      const cycle = width + gap;
      const count = Math.ceil(W / cycle) + 2;
      const vehicles: Vehicle[] = [];
      for (let k = 0; k < count; k++) {
        vehicles.push({ x: k * cycle, width });
      }
      return { row, kind: "road", dir, speed, gap, vehicles, platforms: [] };
    }

    function setupLevel() {
      timeLeft = currentLevelConfig().timeLimit;
      // Filas 13-14 (franja inferior del HUD en canvas) no son carriles jugables:
      // se inicializan inertes para que `lanes` no tenga huecos que `update()` recorra.
      for (let row = SPAWN_ROW + 1; row < ROWS; row++) {
        lanes[row] = { row, kind: "safe", dir: 1, speed: 0, gap: 0, vehicles: [], platforms: [] };
      }
      lanes[GOAL_ROW] = {
        row: GOAL_ROW,
        kind: "goal",
        dir: 1,
        speed: 0,
        gap: 0,
        vehicles: [],
        platforms: [],
      };
      RIVER_ROWS.forEach((row, i) => {
        lanes[row] = buildRiverLane(row, i);
      });
      lanes[SAFE_ROW] = {
        row: SAFE_ROW,
        kind: "safe",
        dir: 1,
        speed: 0,
        gap: 0,
        vehicles: [],
        platforms: [],
      };
      ROAD_ROWS.forEach((row, i) => {
        lanes[row] = buildRoadLane(row, i);
      });
      lanes[SPAWN_ROW] = {
        row: SPAWN_ROW,
        kind: "safe",
        dir: 1,
        speed: 0,
        gap: 0,
        vehicles: [],
        platforms: [],
      };
    }

    function respawnFrog(resetProgress: boolean) {
      frog.row = SPAWN_ROW;
      frog.col = Math.floor(COLS / 2);
      frog.x = frog.col * CELL + CELL / 2;
      frog.ridingLane = null;
      frog.alive = true;
      timeLeft = currentLevelConfig().timeLimit;
      if (resetProgress) maxRowReached = 0;
    }

    function emitStateIfChanged() {
      if (
        score !== lastEmitted.score ||
        level !== lastEmitted.level ||
        lives !== lastEmitted.lives
      ) {
        lastEmitted = { score, level, lives };
        onStateChangeRef.current({ score, level, lives });
      }
    }

    function endGame() {
      gameState = "gameover";
      frog.alive = false;
      if (!gameOverFired) {
        gameOverFired = true;
        onGameOverRef.current(score);
      }
    }

    function loseLife() {
      lives--;
      if (lives <= 0) {
        lives = 0;
        endGame();
        emitStateIfChanged();
        return;
      }
      respawnFrog(true);
      emitStateIfChanged();
    }

    function resolveGoal(col: number) {
      const padIdx = LILYPAD_COLS.indexOf(col);
      if (padIdx === -1 || lilypads[padIdx]) {
        loseLife();
        return;
      }
      lilypads[padIdx] = true;
      score += 50 + Math.round(Math.max(0, timeLeft)) * 10;
      if (lilypads.every(Boolean)) {
        score += 200;
        level++;
        lilypads.fill(false);
        setupLevel();
      }
      respawnFrog(false);
      emitStateIfChanged();
    }

    function tryJump(dir: { x: number; y: number }) {
      if (gameState !== "playing") return;
      const col = Math.round(frog.x / CELL - 0.5);
      const newRow = frog.row + dir.y;
      const newCol = col + dir.x;
      if (newRow < 0 || newRow > SPAWN_ROW) return;
      if (newCol < 0 || newCol >= COLS) return;
      if (newRow === GOAL_ROW) {
        resolveGoal(newCol);
        return;
      }
      frog.row = newRow;
      frog.col = newCol;
      frog.x = newCol * CELL + CELL / 2;
      const progress = SPAWN_ROW - frog.row;
      if (progress > maxRowReached) {
        score += 10 * (progress - maxRowReached);
        maxRowReached = progress;
      }
      emitStateIfChanged();
    }

    function stepLane(lane: Lane, dt: number) {
      const move = lane.dir * lane.speed * dt;
      if (lane.kind === "river") {
        const platforms = lane.platforms;
        const width = platforms[0]?.width ?? 0;
        const cycle = width + lane.gap;
        const span = cycle * platforms.length;
        const dive = currentLevelConfig().turtlesDive;
        for (let i = 0; i < platforms.length; i++) {
          const p = platforms[i];
          p.x += move;
          if (lane.dir > 0 && p.x > W) p.x -= span;
          if (lane.dir < 0 && p.x + p.width < 0) p.x += span;
          if (p.kind === "turtle") {
            p.diveTimer = (p.diveTimer + dt * 1000) % DIVE_CYCLE_MS;
            p.submerged = dive && p.diveTimer > DIVE_CYCLE_MS - DIVE_SUBMERGED_MS;
          }
        }
      } else if (lane.kind === "road") {
        const vehicles = lane.vehicles;
        const width = vehicles[0]?.width ?? 0;
        const cycle = width + lane.gap;
        const span = cycle * vehicles.length;
        for (let i = 0; i < vehicles.length; i++) {
          const v = vehicles[i];
          v.x += move;
          if (lane.dir > 0 && v.x > W) v.x -= span;
          if (lane.dir < 0 && v.x + v.width < 0) v.x += span;
        }
      }
    }

    function findRidingPlatform(lane: Lane, frogX: number): Platform | null {
      let best: Platform | null = null;
      let bestOverlap = 0;
      for (const p of lane.platforms) {
        if (p.kind === "turtle" && p.submerged) continue;
        const overlap =
          Math.min(frogX + FROG_HALF, p.x + p.width) - Math.max(frogX - FROG_HALF, p.x);
        if (overlap > bestOverlap) {
          bestOverlap = overlap;
          best = p;
        }
      }
      return bestOverlap > 0 ? best : null;
    }

    function isHitByVehicle(lane: Lane, frogX: number): boolean {
      const vehicles = lane.vehicles;
      for (let i = 0; i < vehicles.length; i++) {
        const v = vehicles[i];
        const overlap =
          Math.min(frogX + FROG_HALF, v.x + v.width) - Math.max(frogX - FROG_HALF, v.x);
        if (overlap > 0) return true;
      }
      return false;
    }

    function update(dt: number) {
      for (const lane of lanes) {
        if (lane.kind === "river" || lane.kind === "road") stepLane(lane, dt);
      }

      if (frog.row >= 1 && frog.row <= 5) {
        const lane = lanes[frog.row];
        const platform = findRidingPlatform(lane, frog.x);
        if (!platform) {
          loseLife();
          return;
        }
        frog.ridingLane = frog.row;
        frog.x += lane.dir * lane.speed * dt;
        if (frog.x < -FROG_HALF || frog.x > W + FROG_HALF) {
          loseLife();
          return;
        }
      } else {
        frog.ridingLane = null;
      }

      if (frog.row >= 7 && frog.row <= 11) {
        const lane = lanes[frog.row];
        if (isHitByVehicle(lane, frog.x)) {
          loseLife();
          return;
        }
      }

      timeLeft -= dt;
      if (timeLeft <= 0) {
        timeLeft = 0;
        loseLife();
      }
    }

    function drawRoadMarkings() {
      ctx.strokeStyle = FROGGER_SKINS[skinRef.current].roadMarking;
      ctx.lineWidth = 2;
      ctx.setLineDash(ROAD_DASH);
      for (let i = 0; i < ROAD_ROWS.length; i++) {
        const y = ROAD_ROWS[i] * CELL + CELL / 2;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(W, y);
        ctx.stroke();
      }
      ctx.setLineDash(NO_DASH);
    }

    function drawPlatforms(glow: GlowSpriteCache | null) {
      const s = FROGGER_SKINS[skinRef.current];
      for (let ri = 0; ri < RIVER_ROWS.length; ri++) {
        const row = RIVER_ROWS[ri];
        const lane = lanes[row];
        const y = row * CELL;
        const platforms = lane.platforms;
        if (platforms.length === 0) continue;
        // El tipo de carril (log/turtle) es constante para todas las plataformas
        // de esta fila, así que el estilo de relleno/glow se fija una sola vez.
        if (platforms[0].kind === "log") {
          const sprite = glow?.logsByWidth.get(platforms[0].width);
          if (sprite) {
            for (let k = 0; k < platforms.length; k++) {
              const p = platforms[k];
              ctx.drawImage(sprite.canvas, p.x - sprite.anchorX, y + 6 - sprite.anchorY);
            }
          } else {
            ctx.fillStyle = s.log;
            for (let k = 0; k < platforms.length; k++) {
              const p = platforms[k];
              ctx.beginPath();
              ctx.roundRect(p.x, y + 6, p.width, CELL - 12, 6);
              ctx.fill();
            }
          }
        } else {
          let lastSubmerged: boolean | null = null;
          for (let k = 0; k < platforms.length; k++) {
            const p = platforms[k];
            const cx = p.x + p.width / 2;
            const cy = y + CELL / 2;
            if (!p.submerged && glow) {
              ctx.drawImage(glow.turtle.canvas, cx - glow.turtle.anchorX, cy - glow.turtle.anchorY);
              lastSubmerged = false;
              continue;
            }
            if (p.submerged !== lastSubmerged) {
              ctx.fillStyle = p.submerged ? s.turtleSubmerged : s.turtle;
              lastSubmerged = p.submerged;
            }
            ctx.beginPath();
            ctx.ellipse(cx, cy, p.width / 2, CELL / 2 - 6, 0, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }
    }

    function drawVehicles(glow: GlowSpriteCache | null) {
      const s = FROGGER_SKINS[skinRef.current];
      for (let ri = 0; ri < ROAD_ROWS.length; ri++) {
        const row = ROAD_ROWS[ri];
        const lane = lanes[row];
        const y = row * CELL;
        const vehicles = lane.vehicles;
        if (vehicles.length === 0) continue;
        if (glow) {
          const sprite = glow.vehiclesByLane[ri];
          for (let k = 0; k < vehicles.length; k++) {
            const v = vehicles[k];
            ctx.drawImage(sprite.canvas, v.x - sprite.anchorX, y + 8 - sprite.anchorY);
          }
        } else {
          // Todos los vehículos de un carril comparten color: se fija una vez.
          ctx.fillStyle = s.vehicles[ri % s.vehicles.length];
          for (let k = 0; k < vehicles.length; k++) {
            const v = vehicles[k];
            ctx.beginPath();
            ctx.roundRect(v.x, y + 8, v.width, CELL - 16, 5);
            ctx.fill();
          }
        }
      }
    }

    function drawLilypads(glow: GlowSpriteCache | null) {
      const s = FROGGER_SKINS[skinRef.current];
      const cy = GOAL_ROW * CELL + CELL / 2;
      if (!glow) {
        // color/ancho de trazo son constantes para las 5 formas: se fijan una sola vez.
        ctx.fillStyle = s.lilypad;
        ctx.strokeStyle = s.lilypad;
        ctx.lineWidth = 2;
      }
      for (let i = 0; i < LILYPAD_COLS.length; i++) {
        const filled = lilypads[i];
        const cx = LILYPAD_COLS[i] * CELL + CELL / 2;
        if (glow) {
          const sprite = filled ? glow.lilypadFilled : glow.lilypadEmpty;
          ctx.drawImage(sprite.canvas, cx - sprite.anchorX, cy - sprite.anchorY);
          continue;
        }
        ctx.beginPath();
        ctx.ellipse(cx, cy, 15, 11, 0, 0, Math.PI * 2);
        if (filled) ctx.fill();
        else ctx.stroke();
      }
    }

    function drawFrog(glow: GlowSpriteCache | null) {
      if (!frog.alive) return;
      const s = FROGGER_SKINS[skinRef.current];
      const y = frog.row * CELL + CELL / 2;
      if (glow) {
        ctx.drawImage(glow.frog.canvas, frog.x - glow.frog.anchorX, y - glow.frog.anchorY);
      } else {
        ctx.fillStyle = s.frog;
        ctx.beginPath();
        ctx.ellipse(frog.x, y, 15, 13, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = s.frogEye;
      ctx.beginPath();
      ctx.ellipse(frog.x - 6, y - 8, 3.5, 3.5, 0, 0, Math.PI * 2);
      ctx.ellipse(frog.x + 6, y - 8, 3.5, 3.5, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    function drawBottomStrip() {
      const s = FROGGER_SKINS[skinRef.current];
      const top = (SPAWN_ROW + 1) * CELL;
      ctx.fillStyle = s.hudStrip;
      ctx.fillRect(0, top, W, H - top);

      const cfg = currentLevelConfig();
      const ratio = Math.max(0, timeLeft / cfg.timeLimit);
      const barColor = ratio > 0.5 ? s.timerHigh : ratio > 0.2 ? s.timerMid : s.timerLow;
      ctx.fillStyle = s.hudTrack;
      ctx.fillRect(20, top + 10, W - 40, 10);
      ctx.fillStyle = barColor;
      ctx.shadowColor = barColor;
      ctx.shadowBlur = s.glowPlatform;
      ctx.fillRect(20, top + 10, (W - 40) * ratio, 10);
      ctx.shadowBlur = 0;

      ctx.fillStyle = s.hudText;
      ctx.fillText("NENÚFARES", 20, top + 28);
      let lastChipFilled: boolean | null = null;
      for (let i = 0; i < lilypads.length; i++) {
        const filled = lilypads[i];
        const cx = 130 + i * 22;
        const cy = top + 34;
        ctx.beginPath();
        ctx.ellipse(cx, cy, 8, 6, 0, 0, Math.PI * 2);
        if (filled !== lastChipFilled) {
          ctx.fillStyle = filled ? s.lilypad : s.padChipEmpty;
          lastChipFilled = filled;
        }
        ctx.fill();
      }
    }

    function draw() {
      const s = FROGGER_SKINS[skinRef.current];
      ctx.fillStyle = s.bg;
      ctx.fillRect(0, 0, W, H);

      ctx.fillStyle = s.laneGoal;
      ctx.fillRect(0, GOAL_ROW * CELL, W, CELL);

      // Los 5 carriles de río comparten color de fondo: un solo fillStyle para todos.
      ctx.fillStyle = s.laneRiver;
      for (let i = 0; i < RIVER_ROWS.length; i++) {
        ctx.fillRect(0, RIVER_ROWS[i] * CELL, W, CELL);
      }

      // s.laneSafe también cubre la fila de aparición (SPAWN_ROW), más abajo.
      ctx.fillStyle = s.laneSafe;
      ctx.fillRect(0, SAFE_ROW * CELL, W, CELL);

      ctx.fillStyle = s.laneRoad;
      for (let i = 0; i < ROAD_ROWS.length; i++) {
        ctx.fillRect(0, ROAD_ROWS[i] * CELL, W, CELL);
      }

      ctx.fillStyle = s.laneSafe;
      ctx.fillRect(0, SPAWN_ROW * CELL, W, CELL);

      const glow = ensureGlowSprites();
      drawRoadMarkings();
      drawPlatforms(glow);
      drawVehicles(glow);
      drawLilypads(glow);
      drawFrog(glow);
      drawBottomStrip();
    }

    function init() {
      lives = 3;
      score = 0;
      level = 1;
      maxRowReached = 0;
      lilypads.fill(false);
      gameState = "playing";
      gameOverFired = false;
      lastEmitted = { score: -1, level: -1, lives: -1 };
      setupLevel();
      respawnFrog(true);
      emitStateIfChanged();
    }

    function onKeyDown(e: KeyboardEvent) {
      if (CONTROL_CODES.has(e.code)) e.preventDefault();
      if (pausedRef.current || gameState !== "playing") return;
      if (heldCodes.has(e.code)) return;
      heldCodes.add(e.code);
      const dir = DIRECTION_BY_CODE[e.code];
      if (!dir) return;
      tryJump(dir);
    }

    function onKeyUp(e: KeyboardEvent) {
      heldCodes.delete(e.code);
    }

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);

    let lastTime: number | null = null;
    let rafId = 0;

    function loop(ts: number) {
      rafId = requestAnimationFrame(loop);
      if (pausedRef.current || gameState !== "playing") {
        lastTime = null;
        return;
      }
      const dt = lastTime === null ? 0 : Math.min((ts - lastTime) / 1000, 0.05);
      lastTime = ts;
      update(dt);
      draw();
    }

    init();
    draw();
    // Permite repintar desde el efecto de sync de skin, incluso en pausa o game over.
    redrawRef.current = draw;
    rafId = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(rafId);
      redrawRef.current = null;
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, []);

  return <canvas ref={canvasRef} width={W} height={H} className="asteroids-canvas" />;
}
