import { handleError, json } from './_lib/http.js';
import { getQuizSlug, getSupabase } from './_lib/supabase.js';

export async function GET() {
  try {
    const supabase = getSupabase();
    const { data: quiz, error: quizError } = await supabase
      .from('pipa_quizzes')
      .select('id')
      .eq('slug', getQuizSlug())
      .eq('is_active', true)
      .maybeSingle();

    if (quizError) throw quizError;
    if (!quiz) return json([]);

    const { data, error } = await supabase
      .from('pipa_leaderboard')
      .select('session_id,player_name,score,elapsed_ms,rank_position')
      .eq('quiz_id', quiz.id)
      .order('rank_position', { ascending: true })
      .limit(100);

    if (error) throw error;
    return json(data.map(row => ({
      id: row.session_id,
      nombre: row.player_name,
      puntaje: row.score,
      tiempo: row.elapsed_ms
    })));
  } catch (error) {
    return handleError(error, 'api/ranking');
  }
}
