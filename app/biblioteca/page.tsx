"use client";

import { useEffect, useMemo, useState } from "react";
import { CATS, fetchGame, type Game } from "../data/games";
import { REAL_GAME_IDS } from "../data/real-games";
import { GameCard } from "../components/game-card";

export default function Home() {
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("TODOS");
  const [games, setGames] = useState<Game[]>([]);

  useEffect(() => {
    Promise.all(REAL_GAME_IDS.map((id) => fetchGame(id))).then((results) =>
      setGames(results.filter((g): g is Game => g !== null)),
    );
  }, []);

  const filtered = useMemo(() => {
    return games.filter(
      (g) => (cat === "TODOS" || g.cat === cat) && g.title.toLowerCase().includes(q.toLowerCase()),
    );
  }, [games, q, cat]);

  return (
    <div className="fade-in">
      <section className="av-hero">
        <h1 className="flicker">ARCADE VAULT</h1>
        <div className="sub">
          INSERTA UNA MONEDA PARA JUGAR <span className="blink">_</span>
        </div>
      </section>

      <div className="av-filters">
        <div className="av-search">
          <span className="ico">⌕</span>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar un juego por nombre…"
          />
        </div>
        <div className="av-chips">
          {CATS.map((c) => (
            <button
              key={c}
              className={"chip" + (cat === c ? " active" : "")}
              onClick={() => setCat(c)}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      <div className="av-grid">
        {filtered.map((g) => (
          <GameCard key={g.id} game={g} />
        ))}
        {filtered.length === 0 && (
          <div
            style={{
              gridColumn: "1 / -1",
              textAlign: "center",
              padding: 80,
              color: "var(--ink-faint)",
            }}
          >
            <div
              className="pixel"
              style={{ fontSize: 14, color: "var(--magenta)", marginBottom: 12 }}
            >
              NO HAY RESULTADOS
            </div>
            <div>Intenta otra búsqueda o categoría.</div>
          </div>
        )}
      </div>
    </div>
  );
}
