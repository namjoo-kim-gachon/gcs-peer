import React, { useState, useCallback, useRef } from 'react';
import { Session } from '../../types';
import Spinner from '../common/Spinner'; // 스피너 컴포넌트 임포트

interface SessionFormModalProps {
  open: boolean;
  initial?: Partial<Session>;
  onSubmit: (data: {
    name: string;
    description?: string;
    teams?: any;
  }) => Promise<void>;
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
  const [lastCheckedTeamText, setLastCheckedTeamText] = useState('');
  const [checkingTeam, setCheckingTeam] = useState(false);
  const [warning, setWarning] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [availableUsers, setAvailableUsers] = useState<string[]>([]);
  const [dbTeamText, setDbTeamText] = useState('');
  const [loadingDbTeam, setLoadingDbTeam] = useState(false);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [isSubmittingForm, setIsSubmittingForm] = useState(false);

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
    if (!open) return; // 모달이 닫혀있으면 무시

    // 상태 초기화를 한 번에 처리
    const initializeForm = () => {
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
      setIsSubmittingForm(false);
    };

    // debounce를 적용하여 빠른 연속 변경 방지
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(initializeForm, 100);

    // cleanup
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [initial, dbTeamText, open]);

  const handleEdit = useCallback(async () => {
    console.log('저장 버튼 클릭됨');

    // debounce 처리
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // 이미 제출 중이면 무시
    if (isSubmittingForm) {
      console.log('이미 제출 중입니다.');
      return;
    }

    setIsSubmittingForm(true);
    setLoading(true);
    setWarning(null);
    setError('');

    try {
      // 입력값 검증
      if (name.length < 1 || name.length > 100) {
        setWarning('이름은 1~100자 필수입니다.');
        return;
      }
      if (description.length > 500) {
        setWarning('설명은 최대 500자입니다.');
        return;
      }

      let teams = undefined;

      // db에서 불러온 팀구성과 현재 입력값이 다를 때만 파싱 API 호출
      if (teamText !== dbTeamText) {
        setCheckingTeam(true);
        const parseRes = await fetch('/api/teams/parse', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: teamText,
            available_users: availableUsers,
          }),
        });
        const parseJson = await parseRes.json();
        setCheckingTeam(false);
        setLastCheckedTeamText(teamText);
        console.log('팀 파싱 결과:', parseJson);

        if (parseJson.warnings && parseJson.warnings.length > 0) {
          setWarning(parseJson.warnings.join('\n'));
          return;
        }
        teams = parseJson.teams;
      }

      // 부모 컴포넌트의 onSubmit 호출 (await로 완료 대기)
      await onSubmit({ name, description, teams });

      console.log('세션 저장 완료');
      // 성공 시에만 입력값 초기화는 부모에서 모달이 닫힐 때 처리됨
    } catch (err: any) {
      console.error('저장 중 오류:', err);
      setError(err.message || '처리 중 오류가 발생했습니다.');
      setWarning('처리 중 오류 발생: ' + String(err));
      setCheckingTeam(false);
    } finally {
      setLoading(false);
      setIsSubmittingForm(false);
    }
  }, [
    name,
    description,
    teamText,
    dbTeamText,
    availableUsers,
    onSubmit,
    isSubmittingForm,
  ]);

  if (!open) return null;

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '12px',
    border: '1px solid #ccc',
    borderRadius: 8,
    fontSize: 16,
    boxSizing: 'border-box',
    transition: 'border-color 0.2s, box-shadow 0.2s',
  };

  const buttonStyle: React.CSSProperties = {
    padding: '12px 20px',
    fontSize: 16,
    fontWeight: 600,
    border: 'none',
    borderRadius: 8,
    cursor: 'pointer',
    transition: 'background 0.2s, box-shadow 0.2s',
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        background: 'rgba(0,0,0,0.4)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}
    >
      <div
        style={{
          background: '#fff',
          padding: '32px',
          borderRadius: 16,
          width: '90%',
          maxWidth: 500,
          boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
        }}
      >
        <h2
          style={{
            margin: '0 0 24px 0',
            fontSize: 24,
            fontWeight: 700,
            color: '#1976d2',
          }}
        >
          세션 {initial?.id ? '수정하기' : '만들기'}
        </h2>

        {(loading || checkingTeam || loadingDbTeam || isSubmittingForm) && (
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              flexDirection: 'row',
              marginBottom: 16,
              gap: 8,
              color: '#555',
            }}
          >
            <Spinner />
            <span>
              {loadingDbTeam
                ? '팀 구성 불러오는 중...'
                : checkingTeam
                  ? '팀 구성 확인 중...'
                  : isSubmittingForm
                    ? '제출 중...'
                    : '저장 중...'}
            </span>
          </div>
        )}

        <div style={{ marginBottom: 16 }}>
          <label
            htmlFor="session-name"
            style={{ display: 'block', fontWeight: 'bold', marginBottom: 8 }}
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
            style={inputStyle}
          />
        </div>
        <div style={{ marginBottom: 16 }}>
          <label
            htmlFor="session-desc"
            style={{ display: 'block', fontWeight: 'bold', marginBottom: 8 }}
          >
            설명
          </label>
          <textarea
            id="session-desc"
            placeholder="설명 (선택)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={500}
            style={{ ...inputStyle, minHeight: 'none', resize: 'vertical' }}
          />
        </div>
        <div style={{ marginBottom: 24 }}>
          <label
            htmlFor="team-text"
            style={{ display: 'block', fontWeight: 'bold', marginBottom: 8 }}
          >
            팀 구성
          </label>
          <textarea
            id="team-text"
            placeholder="예: 1팀: 철수, 영희\n2팀: 둘리, 또치"
            value={loadingDbTeam ? '불러오는 중...' : teamText}
            onChange={(e) => setTeamText(e.target.value)}
            style={{ ...inputStyle, minHeight: 120, resize: 'vertical' }}
            disabled={loadingDbTeam}
          />
        </div>

        {(warning || error) && (
          <div
            style={{
              background: '#fffbe6',
              border: '1px solid #ffe58f',
              borderRadius: 8,
              padding: '12px 16px',
              color: '#d32f2f',
              fontSize: 14,
              marginBottom: 24,
              whiteSpace: 'pre-wrap',
            }}
          >
            {error || warning}
          </div>
        )}

        <div
          style={{
            display: 'flex',
            gap: 12,
            justifyContent: 'flex-end',
          }}
        >
          <button
            onClick={onClose}
            style={{ ...buttonStyle, background: '#f0f0f0', color: '#333' }}
          >
            취소
          </button>
          <button
            onClick={handleEdit}
            style={{
              ...buttonStyle,
              background: '#1976d2',
              color: '#fff',
              boxShadow: '0 2px 8px rgba(25,118,210,0.2)',
            }}
            disabled={
              loading || checkingTeam || loadingDbTeam || isSubmittingForm
            }
          >
            저장
          </button>
        </div>
      </div>
    </div>
  );
};

export default SessionFormModal;
