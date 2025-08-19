import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    detectSessionInUrl: true,
    persistSession: true,
  },
});

// 세션 삭제
export async function deleteSession(id: number) {
  const { error } = await supabase.from('sessions').delete().eq('id', id);
  return { error };
}

// 세션 수정
export async function updateSession(
  id: number,
  data: { name: string; description?: string },
) {
  const { data: updated, error } = await supabase
    .from('sessions')
    .update(data)
    .eq('id', id)
    .select()
    .single();
  return { updated, error };
}
