import type { NextApiRequest, NextApiResponse } from 'next';

// OpenAI API 호출을 위한 라이브러리 (예시: openai 공식)
// 실제 환경에서는 환경변수로 키 관리 필요
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// JSON 스키마 예시 (팀/팀원 구조)
const teamSchema = {
  type: 'object',
  properties: {
    teams: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          members: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                name: { type: 'string' },
              },
              required: ['name'],
            },
          },
        },
        required: ['name', 'members'],
      },
    },
  },
  required: ['teams'],
};

async function parseTeamText(text: string, availableUsers: string[]) {
  // OpenAI API 호출 (gpt-4o 등, json_schema 강제)
  const prompt = `다음 텍스트를 아래 JSON 스키마에 맞게 변환하세요.\n\n입력:\n${text}\n\n스키마:\n${JSON.stringify(teamSchema, null, 2)}\n\n출력은 반드시 JSON만 반환하세요.`;

  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      {
        role: 'system',
        content: '팀/팀원 구성 텍스트를 JSON으로 변환하는 파서 역할입니다.',
      },
      { role: 'user', content: prompt },
    ],
    temperature: 0,
    response_format: { type: 'json_object' },
  });

  // 결과 파싱
  const content = response.choices[0].message?.content;
  let result = null;
  let warnings: string[] = [];
  try {
    result = JSON.parse(content || '{}');
  } catch (e) {
    warnings.push('LLM 응답 파싱 실패');
    result = { teams: [] };
  }
  // 후처리 검증
  const teams = result.teams || [];
  let allMemberNames: string[] = [];
  let teamNames: string[] = [];
  let memberTeamMap: Record<string, string[]> = {};
  for (const team of teams) {
    teamNames.push(team.name);
    if (!Array.isArray(team.members) || team.members.length < 2) {
      warnings.push(`"${team.name}"의 팀원이 2명 미만입니다.`);
    }
    for (const member of team.members) {
      allMemberNames.push(member.name);
      // 이름이 available_users에 있는가?
      if (!availableUsers.includes(member.name)) {
        warnings.push(
          `"${team.name}"의 "${member.name}"은 등록되지 않은 이름입니다.`,
        );
      }
      // 한 사람이 여러 팀에 중복 소속되어 있는가?
      if (!memberTeamMap[member.name]) memberTeamMap[member.name] = [];
      memberTeamMap[member.name].push(team.name);
    }
  }
  // 팀 이름 중복 체크
  const teamNameSet = new Set();
  for (const name of teamNames) {
    if (teamNameSet.has(name)) {
      warnings.push(`"${name}"은 중복된 팀 이름 됩니다.`);
    }
    teamNameSet.add(name);
  }
  // 한 사람이 여러 팀에 중복 소속 체크
  for (const name in memberTeamMap) {
    if (memberTeamMap[name].length > 1) {
      warnings.push(
        `"${name}"이 여러 팀에 중복 소속되어 있습니다: ${memberTeamMap[name].join(', ')}`,
      );
    }
  }
  // 이름 중복 체크 (한 팀 내에서 중복)
  for (const team of teams) {
    const memberSet = new Set();
    for (const member of team.members) {
      if (memberSet.has(member.name)) {
        warnings.push(
          `"${team.name}"에 "${member.name}"이 중복 소속 되어 있습니다.`,
        );
      }
      memberSet.add(member.name);
    }
  }
  return { teams, warnings };
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }
  const { text, available_users } = req.body;
  if (text === undefined || text === null || typeof text !== 'string') {
    res.status(400).json({ error: 'text 필수' });
    return;
  }
  if (!Array.isArray(available_users)) {
    res.status(400).json({ error: 'available_users 필수' });
    return;
  }
  try {
    const result = await parseTeamText(text, available_users);
    res.status(200).json(result);
  } catch (err) {
    res.status(500).json({ error: 'LLM 파싱 오류', details: String(err) });
  }
}
