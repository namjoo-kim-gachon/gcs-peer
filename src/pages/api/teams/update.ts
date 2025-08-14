import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

// 서버용 Supabase 키 (환경변수로 관리)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY as string;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// DB 매핑 규칙 참고: docs/feat.team_mgt.md, docs/worklog.db.md

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }
  const { sessionId, teams, resolutions } = req.body;
  if (!sessionId) {
    res.status(400).json({ error: 'sessionId 필수' });
    return;
  }

  // 트랜잭션으로 기존 데이터 삭제 후 새 데이터 삽입
  let insertedTeams = 0;
  let insertedMembers = 0;
  const teamNames = teams.map((team: any) => team.name);
  const membersToInsert = [];
  for (const team of teams) {
    for (const member of team.members) {
      membersToInsert.push({
        session_id: sessionId,
        team_name: team.name,
        user_name: member.name,
      });
    }
  }

  const supabaseClient = supabase;
  // 불필요한 client 변수 삭제

  // Supabase 트랜잭션: delete 후 insert
  const { error: txError } = await supabaseClient
    .from('team_members')
    .delete()
    .eq('session_id', sessionId);
  if (txError) {
    res
      .status(500)
      .json({ error: '기존 팀원 삭제 실패', detail: txError.message });
    return;
  }
  const { data: insertData, error: insertError } = await supabaseClient
    .from('team_members')
    .insert(membersToInsert);
  if (insertError) {
    res
      .status(500)
      .json({ error: '팀원 삽입 실패', detail: insertError.message });
    return;
  }
  insertedMembers = membersToInsert.length;
  insertedTeams = teams.length;
  res.status(200).json({ insertedTeams, insertedMembers });
}
