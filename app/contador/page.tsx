"use client";

import { useState, type CSSProperties } from "react";

const TOTAL_POKEMON = 1025;
const SPRITE_SIZE = 200;
const SPRITE_BASE_URL =
  "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork";

const pageStyle: CSSProperties = {
  display: "flex",
  justifyContent: "center",
  padding: "40px 20px",
};

const cardStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: 20,
  maxWidth: 360,
  width: "100%",
  padding: 32,
  border: "1px solid var(--line)",
  borderRadius: 12,
  background: "var(--panel, rgba(255,255,255,0.03))",
};

const counterStyle: CSSProperties = {
  fontSize: 48,
  color: "var(--ink)",
  letterSpacing: "0.05em",
};

const spriteStyle: CSSProperties = { imageRendering: "pixelated" };

const pokedexLabelStyle: CSSProperties = {
  fontSize: 11,
  color: "var(--ink-faint)",
  letterSpacing: "0.1em",
};

const buttonStyle: CSSProperties = { width: "100%" };

export default function ContadorPage() {
  const [count, setCount] = useState(1);

  // Cada click avanza un Pokémon; después del #1025 vuelve al #1.
  const pokemonId = ((count - 1) % TOTAL_POKEMON) + 1;

  return (
    <div className="fade-in" style={pageStyle}>
      <div style={cardStyle}>
        <h2 className="neon-cyan">CONTADOR POKÉMON</h2>

        <div className="mono" style={counterStyle}>
          {count}
        </div>

        <img
          src={`${SPRITE_BASE_URL}/${pokemonId}.png`}
          alt={`Pokémon #${pokemonId}`}
          width={SPRITE_SIZE}
          height={SPRITE_SIZE}
          style={spriteStyle}
        />

        <div className="mono" style={pokedexLabelStyle}>
          POKÉDEX #{String(pokemonId).padStart(3, "0")}
        </div>

        <button
          className="btn lg"
          type="button"
          style={buttonStyle}
          onClick={() => setCount((current) => current + 1)}
        >
          +1
        </button>
      </div>
    </div>
  );
}
