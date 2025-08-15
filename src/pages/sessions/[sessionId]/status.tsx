import { useEffect, useMemo, useState } from 'react';
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
    return v ? Number(v) : NaN;
  }, [sessionId]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [authorized, setAuthorized] = useState(false);

  const [session, setSession] = useState<SessionRow | null>(null);
  const [members, setMembers] = useState<string[]>([]);
  const [votedSet, setVotedSet] = useState<Set<string>>(new Set());

  const voteUrl = sid ? `https://peer.1000.school/vote/${sid}` : '';

  useEffect(() => {
    if (!sid || Number.isNaN(sid)) return;

    (async () => {
      const { data: auth } = await supabase.auth.getUser();
      const email = auth?.user?.email;
      if (!email) {
        setError('로그인이 필요합니다.');
        setAuthorized(false);
        setLoading(false);
        return;
      }

      const { data: allow, error: allowErr } = await supabase
        .from('allowed_users')
        .select('email,is_faculty')
        .eq('email', email)
        .single();

      if (allowErr || !allow?.is_faculty) {
        setError('접근 권한이 없습니다.');
        setAuthorized(false);
        setLoading(false);
        return;
      }

      setAuthorized(true);
      await loadSnapshot();
      subscribeRealtime();
    })();

    return () => {
      try {
        supabase.removeAllChannels();
      } catch {}
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sid]);

  async function loadSnapshot() {
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
        .select('user_name, session_id')
        .eq('session_id', sid);
      if (rvErr) throw rvErr;

      const votedNames = new Set<string>(
        (rv ?? []).map((r: any) => r.user_name),
      );
      setVotedSet(votedNames);
    } catch (e: any) {
      setError(e?.message ?? '데이터 로드에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  }

  function subscribeRealtime() {
    const channel = supabase
      .channel(`reviews-status-${sid}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'reviews',
          filter: `session_id=eq.${sid}`,
        },
        async () => {
          const { data: rv } = await supabase
            .from('reviews')
            .select('user_name')
            .eq('session_id', sid);
          setVotedSet(new Set<string>((rv ?? []).map((r: any) => r.user_name)));
        },
      )
      .subscribe();

    return () => {
      try {
        supabase.removeChannel(channel);
      } catch {}
    };
  }

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

  const copyLink = async () => {
    if (!voteUrl) return;
    try {
      await navigator.clipboard.writeText(voteUrl);
      alert('투표 링크가 복사되었습니다.');
    } catch (e) {
      console.error(e);
    }
  };

  if (loading)
    return (
      <div style={{ padding: 24 }}>
        <Spinner />
      </div>
    );
  if (!authorized)
    return (
      <div style={{ padding: 24 }}>
        <ErrorBanner error={error ?? '권한이 없습니다.'} />
      </div>
    );
  if (error)
    return (
      <div style={{ padding: 24 }}>
        <ErrorBanner error={error} />
      </div>
    );
  if (!session)
    return <div style={{ padding: 24 }}>세션 정보를 찾지 못했습니다.</div>;

  const total = members.length;
  const voted = members.filter((m) => votedSet.has(m)).length;
  const progressPct = total > 0 ? Math.round((voted / total) * 100) : 0;

  return (
    <div style={{ padding: 24 }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          marginBottom: 16,
        }}
      >
        <h2 style={{ margin: 0 }}>{session.name} – 투표 현황</h2>
        <span
          style={{
            marginLeft: 8,
            padding: '2px 8px',
            borderRadius: 4,
            background: session.status === 1 ? '#E6FFFB' : '#F5F5F5',
            color: session.status === 1 ? '#006d75' : '#555',
            fontSize: 12,
          }}
        >
          {session.status === 1 ? '진행중' : '대기'}
        </span>
        <div style={{ flex: 1 }} />
        <button onClick={toggleStatus} style={{ padding: '8px 12px' }}>
          {session.status === 1 ? '투표 종료' : '투표 시작'}
        </button>
        <button
          onClick={() => setConfirmOpen(true)}
          style={{ padding: '8px 12px', marginLeft: 8 }}
        >
          리셋
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
        <div
          style={{
            border: '1px solid #eee',
            borderRadius: 8,
            padding: 16,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 16,
          }}
        >
          <QRCodeSVG
            value={voteUrl}
            size={256}
            includeMargin
            aria-label="투표 링크 QR 코드"
          />
          <div style={{ wordBreak: 'break-all', textAlign: 'center' }}>
            {voteUrl}
          </div>
          <button onClick={copyLink} style={{ padding: '6px 10px' }}>
            링크 복사
          </button>
        </div>

        <div
          style={{
            border: '1px solid #eee',
            borderRadius: 8,
            padding: 16,
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
          }}
        >
          <div>
            <strong>진행률: </strong>
            {voted}/{total} ({progressPct}%)
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
              gap: 12,
            }}
          >
            {members.map((name) => {
              const done = votedSet.has(name);
              return (
                <div
                  key={name}
                  style={{
                    padding: 12,
                    borderRadius: 8,
                    border: '1px solid #eaeaea',
                    background: done ? '#F6FFED' : '#fafafa',
                    color: done ? '#389E0D' : '#333',
                    fontWeight: done ? 600 : 400,
                  }}
                >
                  {name}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        title="리뷰 초기화"
        description="해당 세션의 모든 리뷰 데이터를 삭제합니다. 계속할까요?"
        onConfirm={resetReviews}
        onCancel={() => setConfirmOpen(false)}
      />
    </div>
  );
}
