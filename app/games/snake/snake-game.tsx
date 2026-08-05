"use client";

import { useEffect, useRef } from "react";
import type { RealGameProps } from "../registry";
import {
  FRUITS_SHEET_SRC,
  FRUIT_SPRITES,
  pickRandomFruitSprite,
  type FruitSpriteName,
} from "./sprites";

const CELL = 20;
const COLS = 40;
const ROWS = 30;
const W = COLS * CELL;
const H = ROWS * CELL;

const INITIAL_TICK_MS = 150;
const SPEED_UP_EVERY_FRUITS = 5;
const SPEED_UP_FACTOR = 0.95;
const POINTS_PER_FRUIT = 10;

interface Vec2 {
  x: number;
  y: number;
}

interface Food {
  x: number;
  y: number;
  sprite: FruitSpriteName;
}

type GameState = "playing" | "gameover";

const CONTROL_KEYS = new Set([
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

const DIRECTION_BY_CODE: Record<string, Vec2> = {
  ArrowLeft: { x: -1, y: 0 },
  KeyA: { x: -1, y: 0 },
  ArrowRight: { x: 1, y: 0 },
  KeyD: { x: 1, y: 0 },
  ArrowUp: { x: 0, y: -1 },
  KeyW: { x: 0, y: -1 },
  ArrowDown: { x: 0, y: 1 },
  KeyS: { x: 0, y: 1 },
};

function isOpposite(a: Vec2, b: Vec2) {
  return a.x === -b.x && a.y === -b.y;
}

export default function SnakeGame({ paused, onStateChange, onGameOver }: RealGameProps) {
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

    let cancelled = false;
    let fruitsImg: HTMLImageElement | null = null;
    let fruitsLoaded = false;

    let snake: Vec2[] = [];
    let direction: Vec2 = { x: 1, y: 0 };
    let nextDirection: Vec2 = direction;
    let food: Food = { x: 0, y: 0, sprite: "apple" };
    let score = 0;
    let fruitsEaten = 0;
    let level = 1;
    let tickInterval = INITIAL_TICK_MS;
    let tickAccum = 0;
    let gameState: GameState = "playing";
    let gameOverFired = false;
    let lastEmitted = { score: -1, level: -1 };

    function occupiesSnake(x: number, y: number) {
      return snake.some((s) => s.x === x && s.y === y);
    }

    function spawnFood() {
      let x = 0;
      let y = 0;
      do {
        x = Math.floor(Math.random() * COLS);
        y = Math.floor(Math.random() * ROWS);
      } while (occupiesSnake(x, y));
      food = { x, y, sprite: pickRandomFruitSprite() };
    }

    function init() {
      snake = [
        { x: 5, y: 15 },
        { x: 4, y: 15 },
        { x: 3, y: 15 },
      ];
      direction = { x: 1, y: 0 };
      nextDirection = direction;
      score = 0;
      fruitsEaten = 0;
      level = 1;
      tickInterval = INITIAL_TICK_MS;
      tickAccum = 0;
      gameState = "playing";
      gameOverFired = false;
      spawnFood();
      emitStateIfChanged();
    }

    function emitStateIfChanged() {
      if (score !== lastEmitted.score || level !== lastEmitted.level) {
        lastEmitted = { score, level };
        onStateChangeRef.current({ score, level });
      }
    }

    function endGame() {
      gameState = "gameover";
      if (!gameOverFired) {
        gameOverFired = true;
        onGameOverRef.current(score);
      }
    }

    function tick() {
      direction = nextDirection;
      const head = snake[0];
      const newHead: Vec2 = { x: head.x + direction.x, y: head.y + direction.y };

      if (newHead.x < 0 || newHead.x >= COLS || newHead.y < 0 || newHead.y >= ROWS) {
        endGame();
        return;
      }
      if (occupiesSnake(newHead.x, newHead.y)) {
        endGame();
        return;
      }

      snake.unshift(newHead);

      if (newHead.x === food.x && newHead.y === food.y) {
        score += POINTS_PER_FRUIT;
        fruitsEaten++;
        if (fruitsEaten % SPEED_UP_EVERY_FRUITS === 0) {
          level++;
          tickInterval *= SPEED_UP_FACTOR;
        }
        spawnFood();
      } else {
        snake.pop();
      }

      emitStateIfChanged();
    }

    function drawFood() {
      const sprite = FRUIT_SPRITES[food.sprite];
      const dx = food.x * CELL;
      const dy = food.y * CELL;
      if (fruitsLoaded && fruitsImg) {
        ctx.drawImage(fruitsImg, sprite.x, sprite.y, sprite.w, sprite.h, dx, dy, CELL, CELL);
      }
    }

    function drawSnake() {
      snake.forEach((segment, i) => {
        const isHead = i === 0;
        ctx.fillStyle = isHead ? "#7dffb0" : "#00ff88";
        ctx.shadowColor = "#00ff88";
        ctx.shadowBlur = isHead ? 10 : 6;
        ctx.fillRect(segment.x * CELL + 1, segment.y * CELL + 1, CELL - 2, CELL - 2);
      });
      ctx.shadowBlur = 0;
    }

    function draw() {
      ctx.fillStyle = "#0a0a18";
      ctx.fillRect(0, 0, W, H);
      drawFood();
      drawSnake();

      ctx.fillStyle = "#fff";
      ctx.font = "bold 18px monospace";
      ctx.textAlign = "left";
      ctx.textBaseline = "top";
      ctx.fillText("Score: " + score, 10, 10);
      ctx.textAlign = "center";
      ctx.fillText("Nivel: " + level, W / 2, 10);
    }

    function onKeyDown(e: KeyboardEvent) {
      if (CONTROL_KEYS.has(e.code)) e.preventDefault();
      if (pausedRef.current || gameState !== "playing") return;
      const requested = DIRECTION_BY_CODE[e.code];
      if (!requested) return;
      if (isOpposite(requested, direction)) return;
      nextDirection = requested;
    }
    window.addEventListener("keydown", onKeyDown);

    let lastTime: number | null = null;
    let rafId = 0;

    function loop(ts: number) {
      rafId = requestAnimationFrame(loop);

      if (pausedRef.current || gameState !== "playing") {
        lastTime = null;
        return;
      }

      const dt = lastTime === null ? 0 : ts - lastTime;
      lastTime = ts;
      tickAccum += dt;
      while (tickAccum >= tickInterval) {
        tickAccum -= tickInterval;
        tick();
        if (gameState !== "playing") break;
      }

      draw();
    }

    function loadFruitsSheet(cb: () => void) {
      const img = new Image();
      img.onload = () => {
        fruitsImg = img;
        fruitsLoaded = true;
        cb();
      };
      img.src = FRUITS_SHEET_SRC;
    }

    loadFruitsSheet(() => {
      if (cancelled) return;
    });

    init();
    rafId = requestAnimationFrame(loop);

    return () => {
      cancelled = true;
      cancelAnimationFrame(rafId);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  return <canvas ref={canvasRef} width={W} height={H} className="asteroids-canvas" />;
}
