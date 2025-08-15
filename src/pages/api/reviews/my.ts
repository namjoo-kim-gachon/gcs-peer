// Day 2: GET /api/reviews/my - 내 리뷰 조회 API (mock)
import type { NextApiRequest, NextApiResponse } from 'next';

const mockReviews = [
  { peer_name: '홍길동', contrib_rate: 30, is_fit: true },
  { peer_name: '김철수', contrib_rate: 40, is_fit: false },
  { peer_name: '나자신', contrib_rate: 30 },
];

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  // 실제 구현 시: sessionId, user 정보로 DB 조회
  res.status(200).json(mockReviews);
}
