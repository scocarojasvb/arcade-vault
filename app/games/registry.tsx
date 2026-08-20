import type { ComponentType } from "react";
import type { SkinId } from "./skins";
import AsteroidsGame from "./asteroids/asteroids-game";
import TetrisGame from "./tetris/tetris-game";
import ArkanoidGame from "./arkanoid/arkanoid-game";
import SnakeGame from "./snake/snake-game";

export interface RealGameState {
  score: number;
  level: number;
  lives?: number;
  lines?: number;
}

export interface RealGameProps {
  paused: boolean;
  /** Skin activa. Opcional: un juego sin migrar sigue compilando y jugándose igual. */
  skin?: SkinId;
  onStateChange: (state: RealGameState) => void;
  onGameOver: (finalScore: number) => void;
}

export const REAL_GAME_COMPONENTS: Record<string, ComponentType<RealGameProps>> = {
  asteroids: AsteroidsGame,
  tetris: TetrisGame,
  arkanoid: ArkanoidGame,
  snake: SnakeGame,
};
