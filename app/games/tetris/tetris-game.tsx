"use client";

import { useEffect, useRef, useState } from "react";
import type { RealGameProps } from "../registry";

const COLS = 10;
const ROWS = 20;
const BLOCK = 30;
const W = COLS * BLOCK;
const H = ROWS * BLOCK;
const NEXT_SIZE = 120;
const NEXT_GAP = 20;
const STAGE_W = W + NEXT_GAP + NEXT_SIZE;
const STAGE_H = H;

const COLORS: (string | null)[] = [
  null,
  "#4dd0e1", // I - cyan
  "#ffd54f", // O - yellow
  "#ba68c8", // T - purple
  "#81c784", // S - green
  "#e57373", // Z - red
  "#90caf9", // J - pale blue
  "#ffb74d", // L - orange
  "#9e9e9e", // N - tuerca (gris metálico)
];

const PIECES: (number[][] | null)[] = [
  null,
  [
    [0, 0, 0, 0],
    [1, 1, 1, 1],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
  ], // I
  [
    [2, 2],
    [2, 2],
  ], // O
  [
    [0, 3, 0],
    [3, 3, 3],
    [0, 0, 0],
  ], // T
  [
    [0, 4, 4],
    [4, 4, 0],
    [0, 0, 0],
  ], // S
  [
    [5, 5, 0],
    [0, 5, 5],
    [0, 0, 0],
  ], // Z
  [
    [6, 0, 0],
    [6, 6, 6],
    [0, 0, 0],
  ], // J
  [
    [0, 0, 7],
    [7, 7, 7],
    [0, 0, 0],
  ], // L
  [
    [8, 8, 8],
    [8, 0, 8],
    [8, 8, 8],
  ], // N (tuerca)
];

const LINE_SCORES = [0, 100, 300, 500, 800];

type Board = number[][];

interface Piece {
  type: number;
  shape: number[][];
  x: number;
  y: number;
}

export default function TetrisGame({ paused, onStateChange, onGameOver }: RealGameProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const nextCanvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

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
    const wrap = wrapRef.current;
    if (!wrap) return;
    const ro = new ResizeObserver(() => {
      const { width, height } = wrap.getBoundingClientRect();
      if (width > 0 && height > 0) setScale(Math.min(width / STAGE_W, height / STAGE_H));
    });
    ro.observe(wrap);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const nextCanvas = nextCanvasRef.current;
    if (!canvas || !nextCanvas) return;
    const ctx2d = canvas.getContext("2d");
    const nextCtx2d = nextCanvas.getContext("2d");
    if (!ctx2d || !nextCtx2d) return;
    const ctx: CanvasRenderingContext2D = ctx2d;
    const nextCtx: CanvasRenderingContext2D = nextCtx2d;
    const nextCanvasEl: HTMLCanvasElement = nextCanvas;

    function createBoard(): Board {
      return Array.from({ length: ROWS }, () => new Array(COLS).fill(0));
    }

    function randomPiece(): Piece {
      const type = Math.floor(Math.random() * 8) + 1;
      const shape = (PIECES[type] as number[][]).map((row) => [...row]);
      return { type, shape, x: Math.floor(COLS / 2) - Math.floor(shape[0].length / 2), y: 0 };
    }

    let board: Board = createBoard();
    let next: Piece = randomPiece();
    let current: Piece = randomPiece();
    let score = 0;
    let lines = 0;
    let level = 1;
    let dropAccum = 0;
    let dropInterval = 1000;
    let gameOver = false;
    let gameOverFired = false;
    let lastTime: number | null = null;
    let lastEmitted = { score: -1, lines: -1, level: -1 };

    function collide(shape: number[][], ox: number, oy: number) {
      for (let r = 0; r < shape.length; r++) {
        for (let c = 0; c < shape[r].length; c++) {
          if (!shape[r][c]) continue;
          const nx = ox + c;
          const ny = oy + r;
          if (nx < 0 || nx >= COLS || ny >= ROWS) return true;
          if (ny >= 0 && board[ny][nx]) return true;
        }
      }
      return false;
    }

    function rotateCW(shape: number[][]) {
      const rows = shape.length;
      const cols = shape[0].length;
      const result = Array.from({ length: cols }, () => new Array(rows).fill(0));
      for (let r = 0; r < rows; r++)
        for (let c = 0; c < cols; c++) result[c][rows - 1 - r] = shape[r][c];
      return result;
    }

    function tryRotate() {
      const rotated = rotateCW(current.shape);
      const kicks = [0, -1, 1, -2, 2];
      for (const kick of kicks) {
        if (!collide(rotated, current.x + kick, current.y)) {
          current.shape = rotated;
          current.x += kick;
          return;
        }
      }
    }

    function merge() {
      for (let r = 0; r < current.shape.length; r++)
        for (let c = 0; c < current.shape[r].length; c++)
          if (current.shape[r][c]) board[current.y + r][current.x + c] = current.shape[r][c];
    }

    function clearLines() {
      let cleared = 0;
      for (let r = ROWS - 1; r >= 0; r--) {
        if (board[r].every((v) => v !== 0)) {
          board.splice(r, 1);
          board.unshift(new Array(COLS).fill(0));
          cleared++;
          r++;
        }
      }
      if (cleared) {
        lines += cleared;
        score += (LINE_SCORES[cleared] || 0) * level;
        level = Math.floor(lines / 10) + 1;
        dropInterval = Math.max(100, 1000 - (level - 1) * 90);
      }
    }

    function ghostY() {
      let gy = current.y;
      while (!collide(current.shape, current.x, gy + 1)) gy++;
      return gy;
    }

    function hardDrop() {
      const gy = ghostY();
      score += (gy - current.y) * 2;
      current.y = gy;
      lockPiece();
    }

    function softDrop() {
      if (!collide(current.shape, current.x, current.y + 1)) {
        current.y++;
        score += 1;
      } else {
        lockPiece();
      }
    }

    function lockPiece() {
      merge();
      clearLines();
      spawn();
    }

    function endGame() {
      gameOver = true;
      if (!gameOverFired) {
        gameOverFired = true;
        onGameOverRef.current(score);
      }
    }

    function spawn() {
      current = next;
      next = randomPiece();
      if (collide(current.shape, current.x, current.y)) {
        endGame();
      }
      drawNext();
    }

    function emitStateIfChanged() {
      if (
        score !== lastEmitted.score ||
        lines !== lastEmitted.lines ||
        level !== lastEmitted.level
      ) {
        lastEmitted = { score, lines, level };
        onStateChangeRef.current({ score, level, lines });
      }
    }

    function drawBlock(
      context: CanvasRenderingContext2D,
      x: number,
      y: number,
      colorIndex: number,
      size: number,
      alpha = 1,
    ) {
      if (!colorIndex) return;
      const color = COLORS[colorIndex];
      if (!color) return;
      context.globalAlpha = alpha;
      context.fillStyle = color;
      context.fillRect(x * size + 1, y * size + 1, size - 2, size - 2);
      context.fillStyle = "rgba(255,255,255,0.12)";
      context.fillRect(x * size + 1, y * size + 1, size - 2, 4);
      context.globalAlpha = 1;
    }

    function drawGrid() {
      ctx.strokeStyle = "rgba(255,255,255,0.08)";
      ctx.lineWidth = 0.5;
      for (let c = 1; c < COLS; c++) {
        ctx.beginPath();
        ctx.moveTo(c * BLOCK, 0);
        ctx.lineTo(c * BLOCK, ROWS * BLOCK);
        ctx.stroke();
      }
      for (let r = 1; r < ROWS; r++) {
        ctx.beginPath();
        ctx.moveTo(0, r * BLOCK);
        ctx.lineTo(COLS * BLOCK, r * BLOCK);
        ctx.stroke();
      }
    }

    function draw() {
      ctx.fillStyle = "#000";
      ctx.fillRect(0, 0, W, H);
      drawGrid();

      for (let r = 0; r < ROWS; r++)
        for (let c = 0; c < COLS; c++) drawBlock(ctx, c, r, board[r][c], BLOCK);

      const gy = ghostY();
      for (let r = 0; r < current.shape.length; r++)
        for (let c = 0; c < current.shape[r].length; c++)
          if (current.shape[r][c])
            drawBlock(ctx, current.x + c, gy + r, current.shape[r][c], BLOCK, 0.2);

      for (let r = 0; r < current.shape.length; r++)
        for (let c = 0; c < current.shape[r].length; c++)
          drawBlock(ctx, current.x + c, current.y + r, current.shape[r][c], BLOCK);
    }

    function drawNext() {
      const NB = 30;
      nextCtx.clearRect(0, 0, nextCanvasEl.width, nextCanvasEl.height);
      const shape = next.shape;
      const offX = Math.floor((4 - shape[0].length) / 2);
      const offY = Math.floor((4 - shape.length) / 2);
      for (let r = 0; r < shape.length; r++)
        for (let c = 0; c < shape[r].length; c++)
          drawBlock(nextCtx, offX + c, offY + r, shape[r][c], NB);
    }

    const CONTROL_KEYS = new Set(["ArrowLeft", "ArrowRight", "ArrowDown", "ArrowUp", "Space"]);

    function onKeyDown(e: KeyboardEvent) {
      if (CONTROL_KEYS.has(e.code)) e.preventDefault();
      if (pausedRef.current || gameOver) return;
      switch (e.code) {
        case "ArrowLeft":
          if (!collide(current.shape, current.x - 1, current.y)) current.x--;
          break;
        case "ArrowRight":
          if (!collide(current.shape, current.x + 1, current.y)) current.x++;
          break;
        case "ArrowDown":
          softDrop();
          break;
        case "ArrowUp":
        case "KeyX":
          tryRotate();
          break;
        case "Space":
          hardDrop();
          break;
        default:
          return;
      }
      emitStateIfChanged();
    }
    window.addEventListener("keydown", onKeyDown);

    function init() {
      board = createBoard();
      score = 0;
      lines = 0;
      level = 1;
      dropInterval = 1000;
      dropAccum = 0;
      lastTime = null;
      gameOver = false;
      gameOverFired = false;
      next = randomPiece();
      spawn();
      emitStateIfChanged();
    }

    let rafId = 0;

    function loop(ts: number) {
      rafId = requestAnimationFrame(loop);

      if (pausedRef.current || gameOver) {
        lastTime = null;
        return;
      }

      const dt = lastTime === null ? 0 : ts - lastTime;
      lastTime = ts;
      dropAccum += dt;
      if (dropAccum >= dropInterval) {
        dropAccum = 0;
        if (!collide(current.shape, current.x, current.y + 1)) current.y++;
        else lockPiece();
      }

      draw();
      emitStateIfChanged();
    }

    init();
    rafId = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  return (
    <div ref={wrapRef} className="tetris-wrap">
      <div
        className="tetris-stage"
        style={{
          width: STAGE_W,
          height: STAGE_H,
          transform: `translate(-50%, -50%) scale(${scale})`,
        }}
      >
        <canvas ref={canvasRef} width={W} height={H} className="tetris-canvas" />
        <canvas
          ref={nextCanvasRef}
          width={NEXT_SIZE}
          height={NEXT_SIZE}
          className="tetris-next-canvas"
          style={{ left: W + NEXT_GAP, width: NEXT_SIZE, height: NEXT_SIZE }}
        />
      </div>
    </div>
  );
}
