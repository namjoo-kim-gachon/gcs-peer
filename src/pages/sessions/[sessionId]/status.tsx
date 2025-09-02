import { FaPlay, FaStop, FaSync, FaArrowLeft } from 'react-icons/fa';
import { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/router';
import { QRCodeSVG } from 'qrcode.react';
import { supabase } from '../../../utils/supabaseClient';
import Spinner from '../../../components/common/Spinner';
import ErrorBanner from '../../../components/common/ErrorBanner';
import ConfirmDialog from '../../../components/common/ConfirmDialog';

type SessionRow = { id: number; name: string; status: number };

export default function SessionStatusPage() {
  const router = useRouter();
  const { sessionId } = router.query;
  const sid = useMemo(() => {
    const v = Array.isArray(sessionId) ? sessionId[0] : sessionId;
    if (v === undefined) return NaN; // 존재하지 않으면 NaN
    const n = Number(v);
    return Number.isNaN(n) ? NaN : n; // 변환 실패 시 NaN
  }, [sessionId]);
  const validSid = !Number.isNaN(sid); // 0도 유효한 ID로 허용

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [authorized, setAuthorized] = useState(false);

  const [session, setSession] = useState<SessionRow | null>(null);
  const [members, setMembers] = useState<string[]>([]);
  const [votedSet, setVotedSet] = useState<Set<string>>(new Set());
  const [reviews, setReviews] = useState<any[]>([]);

  // 동적으로 생성된 투표 URL (서버 사이드 렌더링 시에는 빈 문자열)
  const voteUrl = useMemo(() => {
    if (typeof window === 'undefined') return '';
    if (!validSid) return '';
    return `${window.location.origin}/vote?sessionId=${sid}`;
  }, [validSid, sid]);

  // cleanup/구독 핸들러를 ref에 보관하여 안전하게 await 처리
  const unsubscribeRef = useRef<(() => Promise<void>) | null>(null);
  const cleanupRef = useRef<{
    handlePageHide?: () => void;
    handleRouteChange?: () => void;
    stopSession?: () => Promise<void>;
  } | null>(null);
  const eventListenersRegisteredRef = useRef(false);

  // 투표 통계 계산
  const voteStats = useMemo(() => {
    if (reviews.length === 0) return null;

    const selfRates: number[] = [];
    const peerRates: number[] = [];
    const selfFitStats = { fit: 0, total: 0 };
    const peerFitStats = { fit: 0, total: 0 };

    reviews.forEach((review: any) => {
      if (review.user_name === review.peer_name) {
        selfRates.push(review.contrib_rate);
        if (review.is_fit !== null) {
          selfFitStats.total++;
          if (review.is_fit === true) {
            selfFitStats.fit++;
          }
        }
      } else {
        peerRates.push(review.contrib_rate);
        if (review.is_fit !== null) {
          peerFitStats.total++;
          if (review.is_fit === true) {
            peerFitStats.fit++;
          }
        }
      }
    });

    const calculateStats = (rates: number[]) => {
      if (rates.length === 0) return { avg: 0, median: 0, std: 0 };

      const sorted = [...rates].sort((a, b) => a - b);
      const avg = rates.reduce((sum, rate) => sum + rate, 0) / rates.length;
      const median = sorted[Math.floor(sorted.length / 2)];

      const variance =
        rates.reduce((sum, rate) => sum + Math.pow(rate - avg, 2), 0) /
        rates.length;
      const std = Math.sqrt(variance);

      return { avg, median, std, count: rates.length };
    };

    return {
      self: calculateStats(selfRates),
      peer: calculateStats(peerRates),
      total: selfRates.length + peerRates.length,
      fitStats: {
        self: {
          fitRate:
            selfFitStats.total > 0
              ? (selfFitStats.fit / selfFitStats.total) * 100
              : 0,
          fitCount: selfFitStats.fit,
          totalCount: selfFitStats.total,
        },
        peer: {
          fitRate:
            peerFitStats.total > 0
              ? (peerFitStats.fit / peerFitStats.total) * 100
              : 0,
          fitCount: peerFitStats.fit,
          totalCount: peerFitStats.total,
        },
      },
    };
  }, [reviews]);

  // 진행률과 정렬을 렌더 조건 이전에 계산하여 훅 호출 순서가 변하지 않도록 함
  const total = members.length;
  const voted = members.filter((m) => votedSet.has(m)).length;
  const progressPct = useMemo(
    () => (total > 0 ? Math.round((voted / total) * 100) : 0),
    [total, voted],
  );
  const sortedMembers = useMemo(
    () => [...members].sort((a, b) => a.localeCompare(b, 'ko')),
    [members],
  );

  useEffect(() => {
    if (!router.isReady) return;

    if (!validSid) {
      setError('유효하지 않은 세션 ID입니다.');
      setLoading(false);
      return;
    }

    unsubscribeRef.current = null;
    eventListenersRegisteredRef.current = false;

    let cancelled = false;
    setLoading(true);

    (async () => {
      try {
        const { data: auth } = await supabase.auth.getUser();
        if (cancelled) return;
        const email = auth?.user?.email;
        if (!email) {
          setError('로그인이 필요합니다.');
          setAuthorized(false);
          return; // finally에서 loading false 처리
        }

        const { data: allow, error: allowErr } = await supabase
          .from('allowed_users')
          .select('email,is_faculty')
          .eq('email', email)
          .single();
        if (cancelled) return;
        if (allowErr || !allow?.is_faculty) {
          setError('접근 권한이 없습니다.');
          setAuthorized(false);
          return;
        }

        setAuthorized(true);
        await loadSnapshot(); // 내부에서 오류/로딩 처리
        if (cancelled) return;

        // 진행중으로 세션 상태 업데이트
        try {
          const { data: updatedSession } = await supabase
            .from('sessions')
            .update({ status: 1 })
            .eq('id', sid)
            .select('id,name,status')
            .single();
          if (!cancelled && updatedSession) {
            setSession(updatedSession as SessionRow);
          }
        } catch (e) {
          console.error('세션 상태 업데이트 실패', e);
        }

        if (cancelled) return;
        const unsub = subscribeRealtime();
        if (unsub) {
          unsubscribeRef.current = async () => {
            try {
              await Promise.resolve(unsub());
            } catch (e) {
              console.error('unsubscribe failed', e);
            }
          };
        }

        const stopSession = async () => {
          if (!validSid) return;
          try {
            await supabase.from('sessions').update({ status: 0 }).eq('id', sid);
          } catch (error) {
            console.error('Failed to stop session:', error);
          }
        };

        const handlePageHide = () => {
          if (!validSid) return;
          try {
            const data = new Blob([JSON.stringify({ sessionId: sid })], {
              type: 'application/json',
            });
            navigator.sendBeacon('/api/sessions/stop', data);
          } catch (e) {
            console.error('sendBeacon 실패', e);
          }
        };

        const handleRouteChange = () => {
          // 비동기 stopSession fire-and-forget
          stopSession();
        };

        window.addEventListener('pagehide', handlePageHide);
        router.events.on('routeChangeStart', handleRouteChange);
        eventListenersRegisteredRef.current = true;
        cleanupRef.current = { handlePageHide, handleRouteChange, stopSession };
      } catch (e: any) {
        if (!cancelled) {
          console.error('초기 로딩 실패', e);
          setError(e?.message || '초기 로딩 중 오류가 발생했습니다.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
      try {
        if (unsubscribeRef.current) {
          unsubscribeRef
            .current()
            .catch((e) => console.error('unsubscribe error', e));
        }
        if (eventListenersRegisteredRef.current && cleanupRef.current) {
          const { handlePageHide, handleRouteChange, stopSession } =
            cleanupRef.current;
          if (handlePageHide)
            window.removeEventListener('pagehide', handlePageHide);
          if (handleRouteChange)
            router.events.off('routeChangeStart', handleRouteChange);
          if (stopSession)
            stopSession().catch((e) => console.error('stopSession error', e));
          cleanupRef.current = null;
          eventListenersRegisteredRef.current = false;
        }
      } catch (e) {
        console.error('cleanup error', e);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sid, validSid, router.isReady]);

  const loadSnapshot = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: s, error: sErr } = await supabase
        .from('sessions')
        .select('id,name,status')
        .eq('id', sid)
        .single();
      if (sErr) throw sErr;
      setSession(s as SessionRow);

      const { data: tm, error: tmErr } = await supabase
        .from('team_members')
        .select('user_name')
        .eq('session_id', sid);
      if (tmErr) throw tmErr;

      const names = (tm ?? []).map((m: any) => m.user_name as string);
      setMembers(names);

      const { data: rv, error: rvErr } = await supabase
        .from('reviews')
        .select('user_name, session_id, peer_name, contrib_rate, is_fit')
        .eq('session_id', sid);
      if (rvErr) throw rvErr;

      setReviews(rv ?? []);
      const votedNames = new Set<string>(
        (rv ?? []).map((r: any) => r.user_name),
      );
      setVotedSet(votedNames);
    } catch (e: any) {
      setError(e?.message ?? '데이터 로드에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  }, [sid]);

  const subscribeRealtime = useCallback(() => {
    // sid가 유효하지 않으면 구독하지 않음
    if (!validSid) {
      return () => {};
    }

    const channel = supabase.channel(`reviews-status-${sid}`);

    channel.on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'reviews',
        filter: `session_id=eq.${sid}`,
      },
      async () => {
        try {
          const { data: rv } = await supabase
            .from('reviews')
            .select('user_name, peer_name, contrib_rate, is_fit')
            .eq('session_id', sid);

          setReviews(rv ?? []);
          setVotedSet(new Set<string>((rv ?? []).map((r: any) => r.user_name)));
        } catch (error) {
          console.error('Realtime update failed:', error);
        }
      },
    );

    channel.subscribe();

    return () => {
      try {
        supabase.removeChannel(channel);
      } catch (e) {
        console.error('채널 제거 실패', e);
      }
    };
  }, [sid]);

  async function toggleStatus() {
    if (!session) return;
    const next = session.status === 1 ? 0 : 1;
    const { data, error: upErr } = await supabase
      .from('sessions')
      .update({ status: next })
      .eq('id', session.id)
      .select('id,name,status')
      .single();
    if (upErr) {
      setError(upErr.message);
      return;
    }
    setSession(data as SessionRow);
  }

  const [confirmOpen, setConfirmOpen] = useState(false);
  async function resetReviews() {
    if (!session) return;
    const { error: delErr } = await supabase
      .from('reviews')
      .delete()
      .eq('session_id', session.id);
    if (delErr) {
      setError(delErr.message);
      return;
    }
    await loadSnapshot();
    setConfirmOpen(false);
  }

  // 전문가 스타일 변수
  const cardStyle = {
    maxWidth: '100vw',
    width: '100%',
    margin: '0',
    background: '#fff',
    borderRadius: 0,
    boxShadow: 'none',
    padding: '16px 32px 16px 8px', // 오른쪽 마진을 32px로 확대
    minHeight: '100vh',
  };
  const headerStyle = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    padding: '8px 32px', // 좌우 여백 확대
    borderBottom: '1px solid #eee',
  };
  const titleStyle = {
    fontSize: 18,
    fontWeight: 700,
    color: '#1976d2',
  };
  const statusBadge = {
    marginLeft: 12,
    padding: '4px 14px',
    borderRadius: 16,
    background: session?.status === 1 ? '#E6F9ED' : '#FFF9E3',
    color: session?.status === 1 ? '#388e3c' : '#fbc02d',
    fontSize: 16,
    fontWeight: 700,
    letterSpacing: 1,
    boxShadow:
      session?.status === 1
        ? '0 2px 8px rgba(56,142,60,0.10)'
        : '0 2px 8px rgba(251,192,45,0.10)',
    border:
      session?.status === 1 ? '1.5px solid #388e3c' : '1.5px solid #fbc02d',
    transition: 'all 0.2s',
    textShadow:
      session?.status === 1 ? '0 1px 2px #b6f9c8' : '0 1px 2px #fff7c8',
  };
  const buttonStyle = {
    padding: '10px',
    fontSize: 22,
    fontWeight: 600,
    background: '#1976d2',
    color: '#fff',
    border: 'none',
    borderRadius: '50%',
    boxShadow: '0 2px 8px rgba(25,118,210,0.08)',
    letterSpacing: 1,
    transition: 'background 0.2s',
    cursor: 'pointer',
    opacity: 1,
    marginLeft: 8,
    width: 48,
    height: 48,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  };
  const cardBox = {
    border: '1px solid #e3eafc',
    borderRadius: 16,
    background: '#fff',
    boxShadow: '0 4px 24px rgba(25, 118, 210, 0.08)',
    padding: '32px 24px',
    textAlign: 'center' as const,
    marginBottom: 24,
    height: '100%', // 세로로 채우기
    display: 'flex',
    flexDirection: 'column' as const,
    justifyContent: 'flex-start' as const,
  };
  const gridStyle = {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 32,
    marginTop: 16,
    marginBottom: 24,
    marginRight: 32, // 오른쪽 마진 추가
    height: '480px', // 카드 높이 지정(원하는 값으로 조정 가능)
  };
  const memberCard = {
    padding: 16,
    borderRadius: 12,
    border: '1px solid #e3eafc',
    background: '#f7faff',
    color: '#1976d2',
    fontWeight: 600,
    fontSize: 15,
    marginBottom: 8,
    boxShadow: '0 2px 8px rgba(25,118,210,0.04)',
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    justifyContent: 'center',
  };
  const memberDone = {
    ...memberCard,
    background: '#E3FCEF',
    color: '#388e3c',
    border: '1px solid #b6f9c8',
  };
  const progressBar = {
    width: '100%',
    height: 16,
    background: '#e3eafc',
    borderRadius: 8,
    overflow: 'hidden',
    margin: '12px 0',
  };
  const progressFill = (pct: number) => ({
    width: `${pct}%`,
    height: '100%',
    background: '#1976d2',
    borderRadius: 8,
    transition: 'width 0.3s',
  });

  if (loading)
    return (
      <div style={cardBox}>
        <Spinner />
      </div>
    );
  if (!authorized)
    return (
      <div style={cardBox}>
        <ErrorBanner error={error ?? '권한이 없습니다.'} />
      </div>
    );
  if (error)
    return (
      <div style={cardBox}>
        <ErrorBanner error={error} />
      </div>
    );
  if (!session) return <div style={cardBox}>세션 정보를 찾지 못했습니다.</div>;

  return (
    <div style={cardStyle}>
      {/* 헤더 */}
      <div style={headerStyle}>
        <div style={titleStyle}>{session.name} </div>
        <span style={statusBadge}>
          {session.status === 1 ? '진행중' : '대기중'}
        </span>
        <div style={{ flex: 1 }} />
        <button
          onClick={toggleStatus}
          aria-label={session?.status === 1 ? '세션 중지' : '세션 시작'}
          title={session?.status === 1 ? '세션 중지' : '세션 시작'}
          style={
            session?.status === 1
              ? {
                  ...buttonStyle,
                  background: 'linear-gradient(90deg,#d32f2f 60%,#c62828 100%)',
                  color: '#fff',
                  boxShadow: '0 2px 8px rgba(211,47,47,0.10)',
                }
              : buttonStyle
          }
        >
          {session.status === 1 ? <FaStop /> : <FaPlay />}
        </button>
        <button
          onClick={() => setConfirmOpen(true)}
          aria-label="리뷰 초기화"
          title="리뷰 초기화"
          style={{ ...buttonStyle, background: '#aaa' }}
        >
          <FaSync />
        </button>
        <button
          onClick={() => router.push('/sessions')}
          aria-label="목록으로 돌아가기"
          title="목록으로 돌아가기"
          style={{ ...buttonStyle, background: '#6c757d' }}
        >
          <FaArrowLeft />
        </button>
      </div>

      {/* 본문 카드형 그리드 */}
      <div style={gridStyle}>
        {/* QR 카드 또는 투표 통계 카드 */}
        <div style={cardBox}>
          {session.status === 1 ? (
            // 투표 진행 중일 때 QR 코드 표시
            <div
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                padding: '0',
              }}
            >
              <QRCodeSVG
                value={voteUrl}
                size={360}
                includeMargin
                aria-label="투표 링크 QR 코드"
                style={{ maxWidth: '100%', height: 'auto', marginBottom: 10 }}
              />
              <div
                style={{
                  wordBreak: 'break-all',
                  textAlign: 'center',
                  fontSize: 15,
                  color: '#333',
                  marginBottom: 4,
                }}
              >
                {voteUrl}
              </div>
            </div>
          ) : (
            // 투표 종료 후 통계 표시
            <div style={{ flex: 1, padding: '16px' }}>
              <h3
                style={{
                  color: '#1976d2',
                  marginBottom: 20,
                  textAlign: 'center',
                }}
              >
                리뷰 결과 통계
              </h3>
              {voteStats ? (
                <div
                  style={{ display: 'flex', flexDirection: 'column', gap: 16 }}
                >
                  {/* 평균 차이 막대그래프 */}
                  <div style={{ marginTop: 20 }}>
                    <h4
                      style={{
                        color: '#333',
                        marginBottom: 16,
                        textAlign: 'center',
                      }}
                    >
                      기여율 비교
                    </h4>
                    <div
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 12,
                      }}
                    >
                      {/* 자기 평가 막대 */}
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 12,
                        }}
                      >
                        <div
                          style={{
                            width: 80,
                            fontSize: 14,
                            color: '#1976d2',
                            fontWeight: 600,
                          }}
                        >
                          자기 기여율
                        </div>
                        <div
                          style={{
                            flex: 1,
                            height: 24,
                            background: '#e3eafc',
                            borderRadius: 12,
                            position: 'relative',
                          }}
                        >
                          <div
                            style={{
                              height: '100%',
                              background:
                                'linear-gradient(90deg, #1976d2, #42a5f5)',
                              borderRadius: 12,
                              width: `${Math.min(voteStats.self.avg, 100)}%`,
                              transition: 'width 0.5s ease',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'flex-end',
                              paddingRight: 8,
                              color: 'white',
                              fontSize: 12,
                              fontWeight: 600,
                            }}
                          >
                            {voteStats.self.avg.toFixed(1)}%
                          </div>
                        </div>
                      </div>

                      {/* 동료 평가 막대 */}
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 12,
                        }}
                      >
                        <div
                          style={{
                            width: 80,
                            fontSize: 14,
                            color: '#f57c00',
                            fontWeight: 600,
                          }}
                        >
                          동료 기여율
                        </div>
                        <div
                          style={{
                            flex: 1,
                            height: 24,
                            background: '#ffe0b2',
                            borderRadius: 12,
                            position: 'relative',
                          }}
                        >
                          <div
                            style={{
                              height: '100%',
                              background:
                                'linear-gradient(90deg, #f57c00, #ff9800)',
                              borderRadius: 12,
                              width: `${Math.min(voteStats.peer.avg, 100)}%`,
                              transition: 'width 0.5s ease',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'flex-end',
                              paddingRight: 8,
                              color: 'white',
                              fontSize: 12,
                              fontWeight: 600,
                            }}
                          >
                            {voteStats.peer.avg.toFixed(1)}%
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 팀 적합도 비율 시각화 */}
                  <div style={{ marginTop: 20 }}>
                    <h4
                      style={{
                        color: '#333',
                        marginBottom: 16,
                        textAlign: 'center',
                      }}
                    >
                      적합도 결과
                    </h4>
                    <div
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 12,
                      }}
                    >
                      {/* 동료 평가 적합도 */}
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 12,
                        }}
                      >
                        <div
                          style={{
                            width: 80,
                            fontSize: 14,
                            color: '#f57c00',
                            fontWeight: 600,
                          }}
                        >
                          적합 비율
                        </div>
                        <div
                          style={{
                            flex: 1,
                            height: 24,
                            background: '#ffe0b2',
                            borderRadius: 12,
                            position: 'relative',
                          }}
                        >
                          <div
                            style={{
                              height: '100%',
                              background:
                                'linear-gradient(90deg, #4caf50, #66bb6a)',
                              borderRadius: 12,
                              width: `${Math.min(voteStats.fitStats.peer.fitRate, 100)}%`,
                              transition: 'width 0.5s ease',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'flex-end',
                              paddingRight: 8,
                              color: 'white',
                              fontSize: 12,
                              fontWeight: 600,
                            }}
                          >
                            {voteStats.fitStats.peer.fitRate.toFixed(1)}%
                          </div>
                        </div>
                        <div style={{ width: 60, fontSize: 12, color: '#666' }}>
                          {voteStats.fitStats.peer.fitCount}/
                          {voteStats.fitStats.peer.totalCount}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div style={{ textAlign: 'center', color: '#666' }}>
                  투표 데이터가 없습니다.
                </div>
              )}
            </div>
          )}
        </div>

        {/* 진행률 카드 */}
        <div style={cardBox}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 18,
              fontWeight: 600,
              fontSize: 17,
              color: '#1976d2',
              marginBottom: 12,
              flexWrap: 'wrap',
            }}
          >
            <span>진행률</span>
            <span
              style={{
                fontSize: 16,
                fontWeight: 700,
                color: progressPct === 100 ? '#388e3c' : '#1976d2',
                marginBottom: 0,
              }}
            >
              {voted} / {total} ( {progressPct}% )
            </span>
            <span style={{ minWidth: 120, flex: 1 }}>
              <div
                style={{
                  ...progressBar,
                  margin: 0,
                  display: 'inline-block',
                  verticalAlign: 'middle',
                }}
              >
                <div style={progressFill(progressPct)} />
              </div>
            </span>
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
              gap: 10,
              marginTop: 4,
            }}
          >
            {sortedMembers.map((name) => {
              const done = votedSet.has(name);
              return (
                <div key={name} style={done ? memberDone : memberCard}>
                  {done ? (
                    <span style={{ marginRight: 6, fontSize: 17 }}>✅</span>
                  ) : null}
                  {name}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 리셋 다이얼로그 */}
      <ConfirmDialog
        open={confirmOpen}
        title="리뷰 초기화"
        description="해당 세션의 모든 리뷰 데이터를 삭제합니다. 계속할까요?"
        onConfirm={resetReviews}
        onCancel={() => setConfirmOpen(false)}
      />

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
