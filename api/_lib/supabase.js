import { createClient } from '@supabase/supabase-js';

let client;

export function getSupabase() {
  if (client) return client;

  const url = process.env.SUPABASE_URL;
  const secretKey = process.env.SUPABASE_SECRET_KEY;
  if (!url || !secretKey) {
    throw new Error('Faltan SUPABASE_URL o SUPABASE_SECRET_KEY');
  }

  client = createClient(url, secretKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
  return client;
}

export function getQuizSlug() {
  return process.env.PIPA_QUIZ_SLUG || 'pipa-27-2026';
}
