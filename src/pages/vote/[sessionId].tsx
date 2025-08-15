import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import useAuth from '../../hooks/useAuth';
import { supabase } from '../../utils/supabaseClient';
import Spinner from '../../components/common/Spinner';
import ErrorBanner from '../../components/common/ErrorBanner';
import PageHeader from '../../components/common/PageHeader';

interface TeamMember {
  teamName: string;
  members: string[];
}

const VotePage = () => {
  const router = useRouter();
  const { sessionId } = router.query;
  const [sessionName, setSessionName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [myName, setMyName] = useState<string | null>(null);
  const [myTeam, setMyTeam] = useState<TeamMember | null>(null);
  // Day 2: 리뷰 상태
  const [contribRates, setContribRates] = useState<{ [name: string]: number }>(
    {},
  );
  const [isFits, setIsFits] = useState<{ [name: string]: boolean }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  // 내 표시명 조회 (allowed_users)
  const { user } = useAuth();
  useEffect(() => {
    async function fetchMyName() {
      if (!user?.email) return;
      try {
        const { data, error } = await supabase
          .from('allowed_users')
          .select('name')
          .eq('email', user.email)
          .single();
        if (error || !data) throw new Error('사용자 정보 조회 실패');
        setMyName(data.name);
      } catch (e: any) {
        setError(e.message);
      }
    }
    fetchMyName();
  }, [user]);

  // 세션 정보 및 팀원 목록 조회
  useEffect(() => {
    if (!sessionId || !myName) return;
    async function fetchSessionAndTeam() {
      setLoading(true);
      try {
        // 세션 정보 조회
        const sessionRes = await fetch(
          `/api/sessions/info?sessionId=${sessionId}`,
        );
        if (sessionRes.ok) {
          const sessionData = await sessionRes.json();
          setSessionName(sessionData.name ?? String(sessionId));
        } else {
          setSessionName(String(sessionId));
        }
        // 팀원 목록 조회
        const res = await fetch(`/api/sessions/teams?sessionId=${sessionId}`);
        if (!res.ok) throw new Error('팀원 정보 조회 실패');
        const data = await res.json();
        setTeamMembers(data);
        // 내 팀 찾기
        const team = data.find((t: TeamMember) =>
          t.members.includes(myName ?? ''),
        );
        setMyTeam(team || null);
        // 기여율 기본값: 1/n 균등 분배
        if (team) {
          const n = team.members.length;
          const even = Math.floor(100 / n);
          let leftover = 100 - even * n;
          const initialRates: { [name: string]: number } = {};
          team.members.forEach((member: string, idx: number) => {
            initialRates[member] = even + (leftover > 0 ? 1 : 0);
            if (leftover > 0) leftover--;
          });
          setContribRates(initialRates);
          // 적합도 기본값: 본인 제외 모두 false
          const initialFits: { [name: string]: boolean } = {};
          team.members.forEach((member: string) => {
            if (member !== myName) initialFits[member] = false;
          });
          setIsFits(initialFits);
        }
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    }
    fetchSessionAndTeam();
  }, [sessionId, myName]);

  // Day 2: 기존 리뷰 프리필
  useEffect(() => {
    if (!sessionId || !myName || !myTeam) return;
    async function fetchMyReviews() {
      try {
        const res = await fetch('/api/reviews/my', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ sessionId, user_name: myName }),
        });
        if (!res.ok) return;
        const data = await res.json();
        // 프리필: 팀원 이름 기준으로만 세팅
        const rates: { [name: string]: number } = {};
        const fits: { [name: string]: boolean } = {};
        data.forEach((entry: any) => {
          if (myTeam && myTeam.members.includes(entry.peer_name)) {
            rates[entry.peer_name] = entry.contrib_rate ?? 0;
            if (typeof entry.is_fit === 'boolean')
              fits[entry.peer_name] = entry.is_fit;
          }
        });
        setContribRates(rates);
        setIsFits(fits);
      } catch {}
    }
    fetchMyReviews();
  }, [sessionId, myName, myTeam]);

  if (loading) return <Spinner />;
  if (error) return <ErrorBanner error={error} />;
  if (!myTeam) return <ErrorBanner error="팀 구성 정보가 없습니다." />;

  // Day 2: 합계 계산
  const totalContrib = myTeam.members.reduce(
    (sum, name) => sum + (contribRates[name] ?? 0),
    0,
  );
  const isValid =
    myTeam.members.every(
      (name) => Number.isInteger(contribRates[name]) && contribRates[name] >= 0,
    ) && totalContrib === 100;

  // Day 2: 제출 핸들러
  const handleSubmit = async () => {
    setIsSubmitting(true);
    setSubmitError(null);
    setSubmitSuccess(false);
    try {
      const entries = myTeam.members.map((name) => ({
        peer_name: name,
        contrib_rate: contribRates[name] ?? 0,
        ...(name !== myName ? { is_fit: isFits[name] ?? false } : {}),
      }));
      const res = await fetch('/api/reviews/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ sessionId, entries, user_name: myName }),
      });
      if (!res.ok) throw new Error('제출 실패');
      setSubmitSuccess(true);
    } catch (e: any) {
      setSubmitError(e.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // 전문가 스타일 개선
  const cardStyle = {
    maxWidth: '100vw',
    width: '100%',
    margin: '0',
    background: '#fff',
    borderRadius: 0,
    boxShadow: 'none',
    padding: '16px 8px',
    minHeight: '100vh',
  };
  const sectionTitle = {
    fontSize: 16,
    fontWeight: 600,
    margin: '18px 0 8px 0',
    color: '#1976d2',
  };
  const rowStyle = {
    display: 'flex',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
    flexWrap: 'wrap' as const,
  };
  const nameStyle = {
    minWidth: 60,
    fontWeight: 500,
    color: '#333',
    fontSize: 14,
  };
  const sliderStyle = {
    flex: 1,
    marginRight: 4,
    minWidth: 120,
    maxWidth: '70vw',
    height: 32,
  };
  const percentStyle = {
    minWidth: 32,
    textAlign: 'right' as const,
    fontWeight: 500,
    color: '#1976d2',
    fontSize: 13,
  };

  return (
    <div style={cardStyle}>
      <PageHeader title="Peer review" />
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 20,
          padding: '8px 0',
          borderBottom: '1px solid #eee',
        }}
      >
        <div style={{ fontSize: 16, fontWeight: 700, color: '#1976d2' }}>
          {sessionName ?? sessionId}
        </div>
        <div style={{ fontSize: 16, fontWeight: 700, color: '#333' }}>
          {myTeam.teamName}
        </div>
      </div>

      <div>
        <div style={sectionTitle}>팀원 기여율</div>
        {myTeam.members.map((member) => (
          <div key={member} style={rowStyle}>
            <span style={nameStyle}>{member}</span>
            <input
              type="range"
              min={0}
              max={100}
              step={1}
              value={contribRates[member] ?? 0}
              onChange={(e) => {
                const newValue = Number(e.target.value);
                const prevRates = { ...contribRates };
                const oldValue = prevRates[member] ?? 0;
                const diff = newValue - oldValue;
                const otherMembers = myTeam.members.filter((m) => m !== member);
                let otherTotal = otherMembers.reduce(
                  (sum, m) => sum + (prevRates[m] ?? 0),
                  0,
                );
                let newRates = { ...prevRates, [member]: newValue };
                // 조정분을 나머지 팀원에게 고루 분배
                if (otherMembers.length > 0 && diff !== 0) {
                  let remain = 100 - newValue;
                  // 고르게 분배
                  const even = Math.floor(remain / otherMembers.length);
                  let leftover = remain - even * otherMembers.length;
                  otherMembers.forEach((m, idx) => {
                    newRates[m] = even + (leftover > 0 ? 1 : 0);
                    leftover--;
                  });
                }
                setContribRates(newRates);
              }}
              style={sliderStyle}
            />
            <span style={percentStyle}>{contribRates[member] ?? 0}%</span>
          </div>
        ))}
        <div
          style={{
            fontWeight: 600,
            color: totalContrib === 100 ? '#388e3c' : '#d32f2f',
            marginBottom: 8,
          }}
        ></div>
        {!isValid && (
          <ErrorBanner error="기여율 합계가 100이 되어야 제출할 수 있습니다." />
        )}
      </div>

      <div>
        <div style={sectionTitle}>나와의 적합도</div>
        {myTeam.members
          .filter((m) => m !== myName)
          .map((member) => (
            <div key={member} style={rowStyle}>
              <span style={nameStyle}>{member}</span>
              <input
                type="checkbox"
                checked={isFits[member] === true}
                onChange={(e) =>
                  setIsFits((prev) => ({
                    ...prev,
                    [member]: e.target.checked,
                  }))
                }
                style={{ accentColor: '#1976d2', width: 20, height: 20 }}
              />
              <span style={{ color: '#1976d2', fontWeight: 500 }}>적합</span>
            </div>
          ))}
      </div>

      <div style={{ marginTop: 32 }}>
        {submitError && <ErrorBanner error={submitError} />}
        {submitSuccess && (
          <div style={{ color: '#388e3c', marginBottom: 12, fontWeight: 600 }}>
            제출이 완료되었습니다.
          </div>
        )}
        <button
          onClick={handleSubmit}
          disabled={!isValid || isSubmitting}
          style={{
            width: '100%',
            padding: '14px 0',
            fontSize: 16,
            background: isValid ? '#1976d2' : '#aaa',
            color: '#fff',
            border: 'none',
            borderRadius: 6,
            fontWeight: 600,
            cursor: isValid ? 'pointer' : 'not-allowed',
            boxShadow: isValid ? '0 2px 8px rgba(25,118,210,0.08)' : 'none',
            transition: 'background 0.2s',
            marginBottom: 24,
          }}
        >
          {isSubmitting ? '제출 중...' : '제출'}
        </button>
      </div>
      {/* 카피라이트 영역 */}
      <div
        style={{
          width: '100%',
          textAlign: 'center',
          marginTop: 32,
          color: '#aaa',
          fontSize: 13,
          padding: '16px 0 4px 0',
        }}
      >
        {/* 카피라이트 영역 - 전문가 스타일 */}
        <div
          style={{
            width: '100%',
            textAlign: 'center',
            marginTop: 40,
            color: '#555',
            fontSize: 15,
            fontWeight: 500,
            letterSpacing: 1,
            opacity: 0.7,
            borderTop: '1px solid #eee',
            padding: '18px 0 8px 0',
            background: 'linear-gradient(180deg, #fff 80%, #f7f7f7 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
          }}
        >
          <span
            style={{
              fontSize: 16,
              fontWeight: 700,
              color: '#1976d2',
              opacity: 0.8,
            }}
          >
            ⓒ
          </span>
          <span style={{ fontSize: 15, fontWeight: 500 }}>
            Gachon Cocone School 2025
          </span>
        </div>
      </div>
    </div>
  );
};

export default VotePage;
