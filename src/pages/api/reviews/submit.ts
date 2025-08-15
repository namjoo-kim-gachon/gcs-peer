// Day 2: POST /api/reviews/submit - 리뷰 제출 API (mock)
import type { NextApiRequest, NextApiResponse } from 'next';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method Not Allowed' });
    return;
  }
  // 실제 구현 시: DB upsert 및 검증
  res.status(200).json({ success: true });
}
