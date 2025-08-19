import useSWR from 'swr';
import { supabase } from '../utils/supabaseClient';

interface UserActiveSession {
  session_id: number;
  user_name: string;
  team_name: string;
  session_name: string;
  session_description: string;
  status: number;
  session_created_at: string;
}

interface UseActiveSessionsResult {
  sessions: UserActiveSession[];
  isLoading: boolean;
  error: any;
  mutate: () => void;
}

// 사용자의 진행 중인 세션 목록을 가져오는 fetcher 함수
const fetchActiveSessions = async (
  userName: string,
): Promise<UserActiveSession[]> => {
  const response = await fetch(
    `/api/sessions/my-active?user_name=${encodeURIComponent(userName)}`,
  );

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const data = await response.json();
  return data.sessions || [];
};

// 사용자의 진행 중인 세션을 조회하는 커스텀 훅
export const useActiveSessions = (
  userName?: string,
): UseActiveSessionsResult => {
  const { data, error, mutate } = useSWR(
    userName ? ['active-sessions', userName] : null,
    () => fetchActiveSessions(userName!),
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      refreshInterval: 30000, // 30초마다 자동 새로고침
    },
  );

  return {
    sessions: data || [],
    isLoading: !error && !data,
    error,
    mutate,
  };
};

export default useActiveSessions;
