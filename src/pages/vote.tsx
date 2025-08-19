import { useEffect, useState } from 'react';
import { useRef } from 'react';
import { useRouter } from 'next/router';
import useAuth from '../hooks/useAuth';
import { supabase } from '../utils/supabaseClient';
import Spinner from '../components/common/Spinner';
import ErrorBanner from '../components/common/ErrorBanner';
import PageHeader from '../components/common/PageHeader';

interface TeamMember {
  teamName: string;
  members: string[];
}

const VotePage = () => {
  // 브라우저 환경에서의 setInterval 반환은 number이므로 number | null로 변경
  const pollIntervalRef = useRef<number | null>(null);
  const router = useRouter();
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessionName, setSessionName] = useState<string | null>(null);
  const [sessionStatus, setSessionStatus] = useState<number | null>(null);
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
  const [contribDescriptions, setContribDescriptions] = useState<{
    [name: string]: string;
  }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  // 내 표시명 조회 (allowed_users)
  const { user, loading: authLoading } = useAuth();

  // 사용자 이름 조회
  useEffect(() => {
    const fetchUserName = async () => {
      if (!user?.email) return;

      try {
        const { data, error } = await supabase
          .from('allowed_users')
          .select('name')
          .eq('email', user.email)
          .single();

        if (data && !error) {
          setMyName(data.name);
        } else {
          throw new Error('사용자 정보 조회 실패');
        }
      } catch (e: any) {
        setError(e.message);
        setLoading(false);
      }
    };

    fetchUserName();
  }, [user?.email]);

  // 인증 로딩이 끝났고 로그인 상태가 아니면 홈으로 리다이렉트
  useEffect(() => {
    if (!authLoading && !user) {
      // 로그인하지 않은 경우 홈페이지로 리다이렉트
      router.replace('/');
    }
  }, [authLoading, user, router]);

  // 내 활성 세션 조회 (첫 번째 세션 사용)
  useEffect(() => {
    const fetchActiveSession = async () => {
      if (!myName) return;

      try {
        const response = await fetch(
          `/api/sessions/my-active?user_name=${encodeURIComponent(myName)}`,
        );

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        const sessions = data.sessions || [];

        if (sessions.length > 0) {
          // 첫 번째 활성 세션 사용
          const firstSession = sessions[0];
          setSessionId(String(firstSession.session_id));
          setSessionName(firstSession.session_name);
        } else {
          // 활성 세션이 없는 경우 sessionId를 null로 설정하고 로딩 종료
          setSessionId(null);
          setLoading(false);
        }
      } catch (e: any) {
        console.error('Failed to fetch active sessions:', e);
        setError('활성 세션을 조회하는 중 오류가 발생했습니다.');
        setLoading(false);
      }
    };

    fetchActiveSession();
  }, [myName, router]);

  // 세션 정보 및 팀원 목록 조회 함수 분리
  const fetchSessionAndTeam = async () => {
    if (!sessionId) return;

    setLoading(true);
    try {
      // 세션 정보 조회
      const sessionRes = await fetch(
        `/api/sessions/info?sessionId=${sessionId}`,
      );
      if (sessionRes.ok) {
        const sessionData = await sessionRes.json();
        setSessionName(sessionData.name ?? String(sessionId));
        setSessionStatus(
          typeof sessionData.status === 'number' ? sessionData.status : null,
        );
      } else {
        setSessionName(String(sessionId));
        setSessionStatus(null);
      }
      // 팀원 목록 조회
      const teamRes = await fetch(`/api/sessions/teams?sessionId=${sessionId}`);
      if (!teamRes.ok) throw new Error('팀원 정보 조회 실패');
      const teamData = await teamRes.json();
      setTeamMembers(teamData);
      // 내 팀 찾기
      const team = teamData.find((t: TeamMember) =>
        t.members.includes(myName ?? ''),
      );
      setMyTeam(team || null);
      // 기여율 기본값: 1/n 균등 분배 (프리필 리뷰가 없을 때만 적용)
      if (team) {
        const n = team.members.length;
        const even = Math.floor(100 / n);
        let leftover = 100 - even * n;
        const initialRates: { [name: string]: number } = {};
        team.members.forEach((member: string, idx: number) => {
          initialRates[member] = even + (leftover > 0 ? 1 : 0);
          if (leftover > 0) leftover--;
        });
        // 프리필 리뷰가 없을 때만 초기값 적용
        setContribRates((prev) => {
          const isEmpty =
            !prev ||
            team.members.every((m: string) => !prev[m] || prev[m] === 0);
          return isEmpty ? initialRates : prev;
        });
        // 적합도 기본값: 본인 제외 모두 false
        const initialFits: { [name: string]: boolean } = {};
        team.members.forEach((member: string) => {
          if (member !== myName) initialFits[member] = false;
        });
        setIsFits(initialFits);
        // 설명 기본값: 빈 문자열
        const initialDescriptions: { [name: string]: string } = {};
        team.members.forEach((member: string) => {
          initialDescriptions[member] = '';
        });
        setContribDescriptions((prev) => {
          const isEmpty = !prev || Object.keys(prev).length === 0;
          return isEmpty ? initialDescriptions : prev;
        });
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  // sessionId와 myName이 설정되면 세션 정보 조회
  useEffect(() => {
    if (!sessionId || !myName) return;
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
          body: JSON.stringify({ sessionId: sessionId, user_name: myName }),
        });
        if (!res.ok) return;
        const reviewData = await res.json();
        // 프리필: 팀원 이름 기준으로만 세팅
        const rates: { [name: string]: number } = {};
        const fits: { [name: string]: boolean } = {};
        const descriptions: { [name: string]: string } = {};
        reviewData.forEach((entry: any) => {
          if (myTeam && myTeam.members.includes(entry.peer_name)) {
            rates[entry.peer_name] = entry.contrib_rate ?? 0;
            if (typeof entry.is_fit === 'boolean')
              fits[entry.peer_name] = entry.is_fit;
            descriptions[entry.peer_name] = entry.description ?? '';
          }
        });
        // 프리필 리뷰가 있으면만 덮어쓰기, 없으면 초기값 유지
        if (Object.keys(rates).length > 0) {
          setContribRates(rates);
          setIsFits(fits);
          setContribDescriptions(descriptions);
          setSubmitSuccess(true); // 최초 진입 시 제출 완료 모드로 시작
        } else {
          setSubmitSuccess(false);
        }
      } catch (e) {
        // 디버깅을 위해 오류 로그 출력
        console.error(e);
      }
    }
    fetchMyReviews();
  }, [sessionId, myName, myTeam]);

  // myTeam이 없고 로딩이 끝났다면 렌더가 아닌 effect에서 리다이렉트 처리
  useEffect(() => {
    if (!loading && !error && !myTeam && sessionId) {
      router.replace('/');
    }
  }, [loading, error, myTeam, sessionId, router]);

  if (loading) return <Spinner />;
  if (error) return <ErrorBanner error={error} />;

  // sessionId가 없으면 세션이 없다는 메시지
  if (!sessionId) {
    return (
      <div
        style={{
          maxWidth: 960,
          width: '100%',
          margin: '0 auto',
          boxSizing: 'border-box' as const,
          background: '#fff',
          borderRadius: 0,
          boxShadow: 'none',
          padding: '16px',
          minHeight: '100vh',
        }}
      >
        <PageHeader title="GCS 피어 평가" />
        <div
          style={{
            minHeight: '320px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div
            style={{
              background: '#fff',
              borderRadius: 16,
              boxShadow: '0 4px 24px rgba(25, 118, 210, 0.08)',
              border: '1px solid #e3eafc',
              padding: '48px 32px',
              maxWidth: 420,
              textAlign: 'center',
            }}
          >
            <div
              style={{
                fontSize: 20,
                color: '#333',
                marginBottom: 16,
                fontWeight: 500,
                lineHeight: 1.5,
              }}
            >
              참여할 수 있는 피어 평가가 없습니다.
            </div>

            <div
              style={{
                display: 'flex',
                gap: 12,
                justifyContent: 'center',
                flexWrap: 'wrap',
              }}
            >
              <button
                style={{
                  padding: '10px 28px',
                  fontSize: 16,
                  fontWeight: 600,
                  background: '#1976d2',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 8,
                  boxShadow: '0 2px 8px rgba(25,118,210,0.08)',
                  letterSpacing: 1,
                  transition: 'background 0.2s',
                  cursor: 'pointer',
                }}
                onClick={() => window.location.reload()}
              >
                새로고침
              </button>
            </div>
          </div>
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
  }

  // myTeam 타입 가드: myTeam이 없으면 렌더 중단 (useEffect에서 리다이렉트가 처리됨)
  if (!myTeam) {
    return null;
  }

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
        description: contribDescriptions[name] ?? null,
      }));
      const res = await fetch('/api/reviews/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId: sessionId,
          entries,
          user_name: myName,
        }),
      });
      if (!res.ok) {
        // 403 Forbidden이면 투표참여 불가 화면으로 이동
        if (res.status === 403) {
          setSubmitError('평가가 종료되어 제출하지 못했습니다');
          setTimeout(() => {
            setSubmitError(null);
            setSubmitSuccess(false);
            setIsSubmitting(false);
            setSessionStatus(0); // 투표불가 상태로 전환 (서버가 닫힘을 응답)
          }, 1500);
          return;
        }
        throw new Error('제출 실패');
      }
      // 성공: 현재 세션 상태 유지. 열려있으면 "제출 완료" 화면, 닫혀 있으면 "투표 불가" 화면.
      setSubmitSuccess(true);
    } catch (e: any) {
      setSubmitError(e.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // 전문가 스타일 개선
  const cardStyle = {
    // 컨테이너 최대 너비를 설정해 화면 중앙에 정렬하고 좌우 여백 확보
    maxWidth: 960,
    width: '100%',
    margin: '0 auto',
    boxSizing: 'border-box' as const,
    background: '#fff',
    borderRadius: 0,
    boxShadow: 'none',
    padding: '16px',
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
      <PageHeader title="GCS 피어 평가" />
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
          {myTeam?.teamName}
        </div>
      </div>

      {sessionStatus !== 1 ? (
        <div
          style={{
            minHeight: '320px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div
            style={{
              background: '#fff',
              borderRadius: 16,
              boxShadow: '0 4px 24px rgba(25, 118, 210, 0.08)',
              border: '1px solid #e3eafc',
              padding: '48px 32px',
              maxWidth: 420,
              textAlign: 'center',
            }}
          >
            <div
              style={{
                fontSize: 20,
                color: '#333',
                marginBottom: 16,
                fontWeight: 500,
                lineHeight: 1.5,
              }}
            >
              참여할 수 있는 피어 평가가 없습니다.
            </div>

            <div
              style={{
                marginTop: 32,
                display: 'flex',
                justifyContent: 'center',
              }}
            >
              <button
                style={{
                  padding: '10px 28px',
                  fontSize: 16,
                  fontWeight: 600,
                  background: '#1976d2',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 8,
                  boxShadow: '0 2px 8px rgba(25,118,210,0.08)',
                  letterSpacing: 1,
                  transition: 'background 0.2s',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  opacity: loading ? 0.7 : 1,
                }}
                onClick={fetchSessionAndTeam}
                disabled={loading}
              >
                새로고침
              </button>
            </div>
          </div>
        </div>
      ) : submitSuccess ? (
        <div
          style={{
            minHeight: '320px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div
            style={{
              background: '#fff',
              borderRadius: 16,
              boxShadow: '0 4px 24px rgba(25, 118, 210, 0.08)',
              border: '1px solid #e3eafc',
              padding: '48px 32px',
              maxWidth: 420,
              textAlign: 'center',
            }}
          >
            <div
              style={{
                fontSize: 20,
                color: '#333',
                marginBottom: 16,
                fontWeight: 500,
                lineHeight: 1.5,
              }}
            >
              제출이 완료되었습니다.
            </div>
            <div
              style={{
                marginTop: 32,
                display: 'flex',
                justifyContent: 'center',
              }}
            >
              <button
                style={{
                  padding: '12px 32px',
                  fontSize: 18,
                  fontWeight: 700,
                  background: loading
                    ? 'linear-gradient(90deg,#e3eafc 60%,#b6c8f9 100%)'
                    : 'linear-gradient(90deg,#1976d2 60%,#1565c0 100%)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 12,
                  boxShadow: loading
                    ? 'none'
                    : '0 2px 12px rgba(25,118,210,0.12)',
                  letterSpacing: 1,
                  transition: 'background 0.2s, box-shadow 0.2s',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  opacity: loading ? 0.7 : 1,
                  marginTop: 8,
                }}
                onClick={() => {
                  setSubmitSuccess(false); // 다시 투표 화면으로 진입
                  setSessionStatus(1); // 투표 가능 상태로 변경
                }}
                disabled={loading}
              >
                다시 투표
              </button>
            </div>
          </div>
        </div>
      ) : (
        <>
          <div>
            <div style={sectionTitle}>팀원 기여율</div>
            {myTeam?.members.map((member) => (
              <div key={member} style={rowStyle}>
                <span style={nameStyle}>{member}</span>
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={1}
                  aria-label={`기여율 ${member}`}
                  value={contribRates[member] ?? 0}
                  onChange={(e) => {
                    const newValue = Number(e.target.value);
                    const prevRates = { ...contribRates };
                    const oldValue = prevRates[member] ?? 0;
                    const diff = newValue - oldValue;
                    const otherMembers = myTeam.members.filter(
                      (m) => m !== member,
                    );
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
            {myTeam?.members
              .filter((m) => m !== myName)
              .map((member) => (
                <div key={member} style={rowStyle}>
                  <span style={nameStyle}>{member}</span>
                  <input
                    type="checkbox"
                    aria-label={`${member} 적합 여부`}
                    checked={isFits[member] === true}
                    onChange={(e) =>
                      setIsFits((prev) => ({
                        ...prev,
                        [member]: e.target.checked,
                      }))
                    }
                    style={{ accentColor: '#1976d2', width: 20, height: 20 }}
                  />
                  <span style={{ color: '#1976d2', fontWeight: 500 }}>
                    적합
                  </span>
                </div>
              ))}
          </div>

          {/* 특기 사항 섹션: description을 적는 곳 */}
          <div style={{ marginTop: 24 }}>
            <div style={sectionTitle}>특기 사항</div>
            {myTeam?.members
              .filter((m) => m === myName)
              .map((member) => (
                <div key={`desc-${member}`} style={{ marginBottom: 12 }}>
                  <textarea
                    placeholder="특기 사항 (선택)"
                    rows={3}
                    value={contribDescriptions[member] ?? ''}
                    onChange={(e) =>
                      setContribDescriptions((prev) => ({
                        ...prev,
                        [member]: e.target.value,
                      }))
                    }
                    style={{
                      width: '100%',
                      padding: 8,
                      borderRadius: 6,
                      border: '1px solid #e6e6e6',
                      fontSize: 13,
                      resize: 'vertical' as const,
                    }}
                  />
                </div>
              ))}
          </div>

          <div style={{ marginTop: 32 }}>
            {submitError && <ErrorBanner error={submitError} />}
            {submitSuccess && (
              <div
                style={{ color: '#388e3c', marginBottom: 12, fontWeight: 600 }}
              >
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
        </>
      )}

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
