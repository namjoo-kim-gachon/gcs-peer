import { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '../../../utils/supabaseClient';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { sessionId } = req.body;

    if (!sessionId || isNaN(Number(sessionId))) {
      return res.status(400).json({ error: 'Invalid session ID' });
    }

    await supabase
      .from('sessions')
      .update({ status: 0 })
      .eq('id', Number(sessionId));

    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Failed to stop session:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
