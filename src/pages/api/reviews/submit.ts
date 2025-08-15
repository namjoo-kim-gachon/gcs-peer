import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method Not Allowed' });
    return;
  }

  const { sessionId, entries } = req.body;
  // user_name은 실제 인증 정보에서 가져와야 함. 여기서는 mock: POST body에서 받음
  const user_name = req.body.user_name as string;

  if (!sessionId || !entries || !user_name) {
    res.status(400).json({ error: 'Missing required fields' });
    return;
  }

  // upsert reviews
  const upsertData = entries.map((entry: any) => ({
    session_id: sessionId,
    user_name,
    peer_name: entry.peer_name,
    contrib_rate: entry.contrib_rate,
    is_fit: entry.is_fit ?? null,
  }));

  const { error } = await supabase.from('reviews').upsert(upsertData, {
    onConflict: 'session_id,user_name,peer_name',
  });

  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }

  res.status(200).json({ success: true });
}
