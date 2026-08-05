"use client";

import { useEffect, useRef } from "react";
import type { RealGameProps } from "../registry";

const W = 800;
const H = 600;

const PADDLE_SPEED = 400;
const BLOCK_COLS = 10;
const BLOCK_ROWS = 6;
const BLOCK_W = 64;
const BLOCK_H = 24;
const BLOCKS_ORIGIN_X = (W - BLOCK_COLS * BLOCK_W) / 2;
const BLOCKS_ORIGIN_Y = 80;
const BASE_BALL_VX = 200;
const BASE_BALL_VY = -300;

type BlockColor = "red" | "yellow" | "cyan" | "magenta" | "hotpink" | "green" | "gray";

interface Block {
  x: number;
  y: number;
  w: number;
  h: number;
  color: BlockColor;
  alive: boolean;
}

interface Explosion {
  x: number;
  y: number;
  w: number;
  h: number;
  color: BlockColor;
  elapsed: number;
}

interface Level {
  speed: number;
  blocks: { col: number; row: number; color: BlockColor }[];
}

const LEVELS: Level[] = (() => {
  const rowColors1: BlockColor[] = ["red", "yellow", "cyan", "magenta", "hotpink", "green"];
  const rowColors2: BlockColor[] = ["gray", "cyan", "hotpink", "yellow", "magenta", "green"];
  const rowColors4: BlockColor[] = ["cyan", "magenta", "green", "yellow", "hotpink", "red"];

  const l1: Level["blocks"] = [];
  for (let row = 0; row < BLOCK_ROWS; row++)
    for (let col = 0; col < BLOCK_COLS; col++) l1.push({ col, row, color: rowColors1[row] });

  const l2: Level["blocks"] = [];
  const pyStart = [4, 3, 2, 1, 0, 0];
  const pyEnd = [5, 6, 7, 8, 9, 9];
  for (let row = 0; row < BLOCK_ROWS; row++)
    for (let col = pyStart[row]; col <= pyEnd[row]; col++)
      l2.push({ col, row, color: rowColors2[row] });

  const l3: Level["blocks"] = [];
  for (let row = 0; row < BLOCK_ROWS; row++)
    for (let col = 0; col < BLOCK_COLS; col++)
      if ((col + row) % 2 === 0) l3.push({ col, row, color: row < 3 ? "yellow" : "magenta" });

  const gaps4 = [
    [2, 5, 8],
    [0, 4, 7, 9],
    [1, 3, 6],
    [2, 5, 8, 9],
    [0, 4, 7],
    [1, 3, 6, 9],
  ];
  const l4: Level["blocks"] = [];
  for (let row = 0; row < BLOCK_ROWS; row++)
    for (let col = 0; col < BLOCK_COLS; col++)
      if (!gaps4[row].includes(col)) l4.push({ col, row, color: rowColors4[row] });

  const l5: Level["blocks"] = [];
  for (let row = 0; row < BLOCK_ROWS; row++)
    for (let col = 0; col < BLOCK_COLS; col++) {
      const isFrame = col === 0 || col === 9 || row === 0 || row === 5;
      const isCross = col === 4 || row === 2;
      if (isFrame || isCross)
        l5.push({ col, row, color: isCross && !isFrame ? "hotpink" : "cyan" });
    }

  return [
    { speed: 1.0, blocks: l1 },
    { speed: 1.1, blocks: l2 },
    { speed: 1.21, blocks: l3 },
    { speed: 1.33, blocks: l4 },
    { speed: 1.46, blocks: l5 },
  ];
})();

interface SpriteFrame {
  sx: number;
  sy: number;
  sw: number;
  sh: number;
}

const SPRITES: { paddle: SpriteFrame; ball: SpriteFrame; blocks: Record<BlockColor, SpriteFrame> } =
  {
    paddle: { sx: 32, sy: 112, sw: 162, sh: 14 },
    ball: { sx: 32, sy: 32, sw: 16, sh: 16 },
    blocks: {
      gray: { sx: 32, sy: 288, sw: 32, sh: 16 },
      red: { sx: 32, sy: 176, sw: 32, sh: 16 },
      yellow: { sx: 32, sy: 240, sw: 32, sh: 16 },
      cyan: { sx: 32, sy: 192, sw: 32, sh: 16 },
      magenta: { sx: 32, sy: 224, sw: 32, sh: 16 },
      hotpink: { sx: 32, sy: 256, sw: 32, sh: 16 },
      green: { sx: 32, sy: 208, sw: 32, sh: 16 },
    },
  };

const EXPLOSION_FRAMES: Record<BlockColor, SpriteFrame[]> = {
  red: [
    { sx: 256, sy: 176, sw: 32, sh: 16 },
    { sx: 288, sy: 176, sw: 32, sh: 16 },
    { sx: 320, sy: 176, sw: 32, sh: 16 },
    { sx: 352, sy: 176, sw: 32, sh: 16 },
  ],
  cyan: [
    { sx: 256, sy: 192, sw: 32, sh: 16 },
    { sx: 288, sy: 192, sw: 32, sh: 16 },
    { sx: 320, sy: 192, sw: 32, sh: 16 },
    { sx: 352, sy: 192, sw: 32, sh: 16 },
  ],
  green: [
    { sx: 256, sy: 208, sw: 32, sh: 16 },
    { sx: 288, sy: 208, sw: 32, sh: 16 },
    { sx: 320, sy: 208, sw: 32, sh: 16 },
    { sx: 352, sy: 208, sw: 32, sh: 16 },
  ],
  magenta: [
    { sx: 256, sy: 224, sw: 32, sh: 16 },
    { sx: 288, sy: 224, sw: 32, sh: 16 },
    { sx: 320, sy: 224, sw: 32, sh: 16 },
    { sx: 352, sy: 224, sw: 32, sh: 16 },
  ],
  yellow: [
    { sx: 256, sy: 240, sw: 32, sh: 16 },
    { sx: 288, sy: 240, sw: 32, sh: 16 },
    { sx: 320, sy: 240, sw: 32, sh: 16 },
    { sx: 352, sy: 240, sw: 32, sh: 16 },
  ],
  hotpink: [
    { sx: 256, sy: 256, sw: 32, sh: 16 },
    { sx: 288, sy: 256, sw: 32, sh: 16 },
    { sx: 320, sy: 256, sw: 32, sh: 16 },
    { sx: 352, sy: 256, sw: 32, sh: 16 },
  ],
  gray: [
    { sx: 256, sy: 176, sw: 32, sh: 16 },
    { sx: 288, sy: 176, sw: 32, sh: 16 },
    { sx: 320, sy: 176, sw: 32, sh: 16 },
    { sx: 352, sy: 176, sw: 32, sh: 16 },
  ],
};

const EXPLOSION_DURATION = 150;

type GameState = "playing" | "gameover" | "win";

export default function ArkanoidGame({ paused, onStateChange, onGameOver }: RealGameProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pausedRef = useRef(paused);
  const onStateChangeRef = useRef(onStateChange);
  const onGameOverRef = useRef(onGameOver);

  useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);
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

    let internalPaused = false;
    let cancelled = false;

    const paddle = { x: 0, y: 560, w: 81, h: 14 };
    const ball = { x: 0, y: 0, w: 16, h: 16, vx: 200, vy: -300 };

    const bounceSound = new Audio("/games/arkanoid/sounds/ball-bounce.mp3");
    const breakSound = new Audio("/games/arkanoid/sounds/break-sound.mp3");
    const playSound = (sound: HTMLAudioElement) => {
      const instance = sound.cloneNode(true) as HTMLAudioElement;
      instance.play().catch(() => {});
    };
    const playBounce = () => playSound(bounceSound);
    const playBreak = () => playSound(breakSound);

    let blocks: Block[] = [];
    let explosions: Explosion[] = [];
    let lives = 3;
    let score = 0;
    let gameState: GameState = "playing";
    let currentLevel = 1;
    let gameOverFired = false;
    let lastEmitted = { score: -1, level: -1, lives: -1 };

    let ssImg: HTMLCanvasElement | null = null;
    let ssLoaded = false;

    const keys: Record<string, boolean> = { ArrowLeft: false, ArrowRight: false };

    function initPaddle() {
      paddle.x = (W - paddle.w) / 2;
    }

    function loadLevel(n: number) {
      currentLevel = n;
      const level = LEVELS[n - 1];
      blocks = level.blocks.map((b) => ({
        x: BLOCKS_ORIGIN_X + b.col * BLOCK_W,
        y: BLOCKS_ORIGIN_Y + b.row * BLOCK_H,
        w: BLOCK_W,
        h: BLOCK_H,
        color: b.color,
        alive: true,
      }));
      explosions = [];
      ball.x = paddle.x + (paddle.w - ball.w) / 2;
      ball.y = paddle.y - ball.h;
      ball.vx = BASE_BALL_VX * level.speed;
      ball.vy = BASE_BALL_VY * level.speed;
    }

    function collideAABB(block: Block) {
      return (
        ball.x < block.x + block.w &&
        ball.x + ball.w > block.x &&
        ball.y < block.y + block.h &&
        ball.y + ball.h > block.y
      );
    }

    function emitStateIfChanged() {
      if (
        score !== lastEmitted.score ||
        currentLevel !== lastEmitted.level ||
        lives !== lastEmitted.lives
      ) {
        lastEmitted = { score, level: currentLevel, lives };
        onStateChangeRef.current({ score, level: currentLevel, lives });
      }
    }

    const onMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const scaleX = W / rect.width;
      const mouseX = (e.clientX - rect.left) * scaleX;
      paddle.x = Math.max(0, Math.min(W - paddle.w, mouseX - paddle.w / 2));
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key in keys) keys[e.key] = true;
      if ((e.key === "p" || e.key === "P" || e.key === "Escape") && gameState === "playing") {
        internalPaused = !internalPaused;
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.key in keys) keys[e.key] = false;
    };

    canvas.addEventListener("mousemove", onMouseMove);
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);

    function update(dt: number) {
      if (gameState !== "playing") return;

      if (keys.ArrowLeft) paddle.x = Math.max(0, paddle.x - PADDLE_SPEED * dt);
      if (keys.ArrowRight) paddle.x = Math.min(W - paddle.w, paddle.x + PADDLE_SPEED * dt);

      ball.x += ball.vx * dt;
      ball.y += ball.vy * dt;

      if (ball.x <= 0) {
        ball.x = 0;
        ball.vx = Math.abs(ball.vx);
        playBounce();
      }
      if (ball.x + ball.w >= W) {
        ball.x = W - ball.w;
        ball.vx = -Math.abs(ball.vx);
        playBounce();
      }
      if (ball.y <= 0) {
        ball.y = 0;
        ball.vy = Math.abs(ball.vy);
        playBounce();
      }

      if (
        ball.vy > 0 &&
        ball.x + ball.w > paddle.x &&
        ball.x < paddle.x + paddle.w &&
        ball.y + ball.h >= paddle.y &&
        ball.y + ball.h <= paddle.y + paddle.h + 8
      ) {
        ball.y = paddle.y - ball.h;
        ball.vy = -Math.abs(ball.vy);
        playBounce();
      }

      for (const block of blocks) {
        if (!block.alive) continue;
        if (collideAABB(block)) {
          block.alive = false;
          explosions.push({
            x: block.x,
            y: block.y,
            w: block.w,
            h: block.h,
            color: block.color,
            elapsed: 0,
          });
          score += 10;
          ball.vy = -ball.vy;
          playBreak();
          if (blocks.every((b) => !b.alive)) {
            if (currentLevel < 5) loadLevel(currentLevel + 1);
            else {
              gameState = "win";
              if (!gameOverFired) {
                gameOverFired = true;
                onGameOverRef.current(score);
              }
            }
          }
          break;
        }
      }

      for (const exp of explosions) exp.elapsed += dt * 1000;
      explosions = explosions.filter((exp) => exp.elapsed < EXPLOSION_DURATION);

      if (ball.y > H) {
        lives--;
        if (lives <= 0) {
          lives = 0;
          gameState = "gameover";
          if (!gameOverFired) {
            gameOverFired = true;
            onGameOverRef.current(score);
          }
        } else {
          const speed = LEVELS[currentLevel - 1].speed;
          ball.x = paddle.x + (paddle.w - ball.w) / 2;
          ball.y = paddle.y - ball.h;
          ball.vx = BASE_BALL_VX * speed;
          ball.vy = BASE_BALL_VY * speed;
        }
      }

      emitStateIfChanged();
    }

    function drawSprite(
      name: "paddle" | "ball" | `block_${BlockColor}`,
      x: number,
      y: number,
      w: number,
      h: number,
    ) {
      if (!ssLoaded || !ssImg) return;
      const sp = name.startsWith("block_")
        ? SPRITES.blocks[name.slice(6) as BlockColor]
        : SPRITES[name as "paddle" | "ball"];
      if (!sp) return;
      ctx.drawImage(ssImg, sp.sx, sp.sy, sp.sw, sp.sh, x, y, w, h);
    }

    function drawFrame(frame: SpriteFrame, x: number, y: number, w: number, h: number) {
      if (!ssLoaded || !ssImg) return;
      ctx.drawImage(ssImg, frame.sx, frame.sy, frame.sw, frame.sh, x, y, w, h);
    }

    function draw() {
      ctx.fillStyle = "#000";
      ctx.fillRect(0, 0, W, H);

      for (const block of blocks) {
        if (block.alive) drawSprite(`block_${block.color}`, block.x, block.y, block.w, block.h);
      }

      for (const exp of explosions) {
        const frameIndex = Math.min(Math.floor((exp.elapsed / EXPLOSION_DURATION) * 4), 3);
        drawFrame(EXPLOSION_FRAMES[exp.color][frameIndex], exp.x, exp.y, exp.w, exp.h);
      }

      drawSprite("paddle", paddle.x, paddle.y, paddle.w, paddle.h);
      drawSprite("ball", ball.x, ball.y, ball.w, ball.h);

      ctx.fillStyle = "#fff";
      ctx.font = "bold 18px monospace";
      ctx.textAlign = "left";
      ctx.textBaseline = "top";
      ctx.fillText("Score: " + score, 10, 10);
      ctx.textAlign = "center";
      ctx.fillText("Nivel: " + currentLevel, W / 2, 10);
      const ballSize = 16;
      const ballSpacing = 4;
      for (let i = 0; i < lives; i++) {
        const bx = W - 10 - (lives - i) * (ballSize + ballSpacing);
        drawSprite("ball", bx, 10, ballSize, ballSize);
      }
    }

    let lastTime: number | null = null;
    let rafId = 0;

    function loop(ts: number) {
      rafId = requestAnimationFrame(loop);

      const isPaused = pausedRef.current || internalPaused;
      if (isPaused || gameState !== "playing") {
        lastTime = null;
        return;
      }

      const dt = lastTime === null ? 0 : Math.min((ts - lastTime) / 1000, 0.05);
      lastTime = ts;
      update(dt);
      draw();
    }

    function loadSpritesheet(cb: () => void) {
      const rawImg = new Image();
      rawImg.onload = () => {
        const oc = document.createElement("canvas");
        oc.width = rawImg.width;
        oc.height = rawImg.height;
        const octx = oc.getContext("2d");
        if (octx) octx.drawImage(rawImg, 0, 0);
        ssImg = oc;
        ssLoaded = true;
        cb();
      };
      rawImg.src = "/games/arkanoid/spritesheet-breakout.png";
    }

    loadSpritesheet(() => {
      if (cancelled) return;
      initPaddle();
      loadLevel(1);
      rafId = requestAnimationFrame(loop);
    });

    return () => {
      cancelled = true;
      cancelAnimationFrame(rafId);
      canvas.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, []);

  return <canvas ref={canvasRef} width={W} height={H} className="asteroids-canvas" />;
}
