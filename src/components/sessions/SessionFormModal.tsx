import React, { useState } from 'react';
import { Session } from '../../types';

interface SessionFormModalProps {
  open: boolean;
  initial?: Partial<Session>;
  onSubmit: (data: { name: string; description?: string; teams?: any }) => void;
  onClose: () => void;
}

const SessionFormModal: React.FC<SessionFormModalProps> = ({
  open,
  initial,
  onSubmit,
  onClose,
}) => {
  const [name, setName] = useState(initial?.name || '');
  const [description, setDescription] = useState(initial?.description || '');
  const [error, setError] = useState('');
  const [teamText, setTeamText] = useState('');
  const [warning, setWarning] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [availableUsers, setAvailableUsers] = useState<string[]>([]);
  const [dbTeamText, setDbTeamText] = useState('');
  const [loadingDbTeam, setLoadingDbTeam] = useState(false);

  // allowed_users 목록을 Supabase에서 조회
  React.useEffect(() => {
    async function fetchAllowedUsers() {
      const { data } = await require('../../utils/supabaseClient')
        .supabase.from('allowed_users')
        .select('name');
      if (data && Array.isArray(data)) {
        setAvailableUsers(data.map((u: any) => u.name));
      }
    }
    fetchAllowedUsers();
  }, []);

  // 세션ID가 있을 때 DB에서 팀구성 불러오기 (수정 모드)
  React.useEffect(() => {
    async function fetchDbTeams() {
      if (!initial?.id) {
        setDbTeamText('');
        return;
      }
      setLoadingDbTeam(true);
      try {
        const res = await fetch(`/api/sessions/teams?sessionId=${initial.id}`);
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          const text = data
            .map((t: any) => `${t.teamName} : ${t.members.join(', ')}`)
            .join('\n');
          setDbTeamText(text);
        } else {
          setDbTeamText('');
        }
      } catch {
        setDbTeamText('');
      } finally {
        setLoadingDbTeam(false);
      }
    }
    fetchDbTeams();
  }, [initial?.id]);

  // initial 값이나 open이 바뀔 때마다 입력값 및 상태 초기화
  React.useEffect(() => {
    setName(initial?.name || '');
    setDescription(initial?.description || '');
    if (initial?.id) {
      setTeamText(dbTeamText);
    } else {
      setTeamText('');
    }
    setLoading(false);
    setWarning(null);
    setError('');
  }, [initial, dbTeamText, open]);
  const handleEdit = async () => {
    console.log('수정 버튼 클릭됨');
    setLoading(true);
    setWarning(null);
    if (name.length < 1 || name.length > 100) {
      setWarning('이름은 1~100자 필수입니다.');
      setLoading(false);
      return;
    }
    if (description.length > 500) {
      setWarning('설명은 최대 500자입니다.');
      setLoading(false);
      return;
    }
    try {
      // 1. 팀구성 텍스트와 사용자 목록을 파싱 API로 전달
      const parseRes = await fetch('/api/teams/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: teamText,
          available_users: availableUsers,
        }),
      });
      const parseJson = await parseRes.json();
      console.log('팀 파싱 결과:', parseJson);
      if (parseJson.warnings && parseJson.warnings.length > 0) {
        // 워닝 카드에 에러 표시 후 종료
        setWarning(parseJson.warnings.join('\n'));
        return;
      }
      // 성공 처리 (예: UI 갱신, 모달 닫기 등)
      onSubmit({ name, description, teams: parseJson.teams });
      // 입력값 초기화는 모달이 닫힐 때만 수행
    } catch (err) {
      setWarning('처리 중 오류 발생: ' + String(err));
    } finally {
      setLoading(false);
    }
  };

  // ...미리보기/DB 반영 관련 함수 완전 삭제...

  if (!open) return null;
  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        background: 'rgba(0,0,0,0.2)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}
    >
      <div
        style={{
          background: '#fff',
          padding: 24,
          borderRadius: 8,
          minWidth: 320,
        }}
      >
        <h2>세션 {initial ? '수정' : '생성'}</h2>
        <div style={{ marginBottom: 12 }}>
          <label
            htmlFor="session-name"
            style={{ display: 'block', fontWeight: 'bold', marginBottom: 4 }}
          >
            세션 이름
          </label>
          <input
            id="session-name"
            type="text"
            placeholder="이름"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={100}
            style={{ width: '100%', padding: 8, marginBottom: 8 }}
          />
          <label
            htmlFor="session-desc"
            style={{ display: 'block', fontWeight: 'bold', marginBottom: 4 }}
          >
            설명
          </label>
          <textarea
            id="session-desc"
            placeholder="설명(선택)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={500}
            style={{
              width: '100%',
              padding: 8,
              minHeight: 60,
              marginBottom: 8,
            }}
          />
          <label
            htmlFor="team-text"
            style={{ display: 'block', fontWeight: 'bold', marginBottom: 4 }}
          >
            팀 구성
          </label>
          <textarea
            id="team-text"
            placeholder="팀 구성 내역을 입력하세요 (예시: 1팀 : 철수, 영희   2팀 - 둘리, 마이클 )"
            value={loadingDbTeam ? '불러오는 중...' : teamText}
            onChange={(e) => setTeamText(e.target.value)}
            style={{ width: '100%', padding: 8, minHeight: 80, marginTop: 8 }}
            disabled={loadingDbTeam}
          />
        </div>
        {/* 워닝 카드: 파싱/DB 반영 에러 메시지 */}
        {warning && (
          <div
            style={{
              marginTop: 16,
              background: '#fffbe6',
              border: '1px solid #ffe58f',
              borderRadius: 6,
              padding: 12,
              color: '#d32f2f',
              fontSize: 14,
            }}
          >
            {warning}
          </div>
        )}
        <div
          style={{
            marginTop: 24,
            display: 'flex',
            gap: 12,
            justifyContent: 'flex-end',
          }}
        >
          <button onClick={onClose}>취소</button>
          <button
            onClick={handleEdit}
            style={{ background: '#1976d2', color: '#fff' }}
            disabled={loading}
          >
            수정
          </button>
        </div>
      </div>
    </div>
  );
};

export default SessionFormModal;
