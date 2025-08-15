import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  const { sessionId } = req.query;
  if (!sessionId) {
    return res.status(400).json({ error: 'sessionId is required' });
  }

  // team_members 테이블에서 session_id별 팀/팀원 정보 조회
  const { data: teamMembers, error: teamMembersError } = await supabase
    .from('team_members')
    .select('team_name, user_name')
    .eq('session_id', sessionId)
    .order('team_name', { ascending: true })
    .order('user_name', { ascending: true });

  if (teamMembersError) {
    return res.status(500).json({ error: teamMembersError.message });
  }

  if (!teamMembers || teamMembers.length === 0) {
    return res.status(200).json([]); // 팀이 없으면 빈 배열 반환
  }

  // 팀별로 그룹화
  const teamMap: Record<string, string[]> = {};
  for (const row of teamMembers) {
    if (!teamMap[row.team_name]) teamMap[row.team_name] = [];
    teamMap[row.team_name].push(row.user_name);
  }
  const result = Object.entries(teamMap).map(([teamName, members]) => ({
    teamName,
    members,
  }));

  return res.status(200).json(result);
}
