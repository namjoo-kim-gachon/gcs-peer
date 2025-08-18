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

  const { sessionId, user_name } = req.body;
  if (!sessionId || !user_name) {
    res.status(400).json({ error: 'Missing required fields' });
    return;
  }

  // reviews 테이블에서 내 리뷰 목록 조회
  const { data, error } = await supabase
    .from('reviews')
    .select('peer_name, contrib_rate, is_fit, description')
    .eq('session_id', sessionId)
    .eq('user_name', user_name);

  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }

  res.status(200).json(data ?? []);
}
