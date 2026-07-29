import { createClient } from "../lib/supabase/client";

export interface ScoreRow {
  rank: number;
  name: string;
  score: number;
  date: string;
}

export async function fetchTopScores(gameId: string, limit = 12): Promise<ScoreRow[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("scores")
    .select("name, score, created_at")
    .eq("game_id", gameId)
    .order("score", { ascending: false })
    .limit(limit);

  if (error) throw error;

  return (data ?? []).map((row, index) => {
    const created = new Date(row.created_at);
    const day = String(created.getDate()).padStart(2, "0");
    const month = String(created.getMonth() + 1).padStart(2, "0");
    const year = created.getFullYear();
    return {
      rank: index + 1,
      name: row.name,
      score: row.score,
      date: `${day}/${month}/${year}`,
    };
  });
}
