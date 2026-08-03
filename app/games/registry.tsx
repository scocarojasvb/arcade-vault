import type { ComponentType } from "react";
import AsteroidsGame from "./asteroids/asteroids-game";

export interface RealGameState {
  score: number;
  level: number;
  lives?: number;
  lines?: number;
}

export interface RealGameProps {
  paused: boolean;
  onStateChange: (state: RealGameState) => void;
  onGameOver: (finalScore: number) => void;
}

export const REAL_GAME_COMPONENTS: Record<string, ComponentType<RealGameProps>> = {
  asteroids: AsteroidsGame,
};
