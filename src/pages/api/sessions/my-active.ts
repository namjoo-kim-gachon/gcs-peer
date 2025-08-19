import { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '../../../utils/supabaseClient';

interface UserActiveSession {
  session_id: number;
  user_name: string;
  team_name: string;
  session_name: string;
  session_description: string;
  status: number;
  session_created_at: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { user_name } = req.query;

    if (!user_name || typeof user_name !== 'string') {
      return res.status(400).json({ error: 'user_name parameter is required' });
    }

    // user_active_sessions 뷰에서 해당 사용자의 진행 중인 세션 조회
    const { data, error } = await supabase
      .from('user_active_sessions')
      .select('*')
      .eq('user_name', user_name);

    if (error) {
      console.error('Error fetching user active sessions:', error);
      return res.status(500).json({ error: 'Failed to fetch active sessions' });
    }

    const sessions: UserActiveSession[] = data || [];

    return res.status(200).json({
      sessions,
      count: sessions.length,
    });
  } catch (error) {
    console.error('Unexpected error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
