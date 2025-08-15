import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
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
  useEffect(() => {
    async function fetchMyName() {
      try {
        // TODO: 실제 인증 정보에서 이메일 가져오기
        const email = '';
        const res = await fetch(`/api/allowed_users/me?email=${email}`);
        if (!res.ok) throw new Error('사용자 정보 조회 실패');
        const data = await res.json();
        setMyName(data.name);
      } catch (e: any) {
        setError(e.message);
      }
    }
    fetchMyName();
  }, []);

  // 팀원 목록 조회
  useEffect(() => {
    if (!sessionId || !myName) return;
    async function fetchTeamMembers() {
      setLoading(true);
      try {
        const res = await fetch(`/api/sessions/teams?sessionId=${sessionId}`);
        if (!res.ok) throw new Error('팀원 정보 조회 실패');
        const data = await res.json();
        setTeamMembers(data);
        // 내 팀 찾기
        const team = data.find((t: TeamMember) =>
          t.members.includes(myName ?? ''),
        );
        setMyTeam(team || null);
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    }
    fetchTeamMembers();
  }, [sessionId, myName]);

  // Day 2: 기존 리뷰 프리필
  useEffect(() => {
    if (!sessionId || !myName || !myTeam) return;
    async function fetchMyReviews() {
      try {
        const res = await fetch(`/api/reviews/my?sessionId=${sessionId}`);
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
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, entries }),
      });
      if (!res.ok) throw new Error('제출 실패');
      setSubmitSuccess(true);
    } catch (e: any) {
      setSubmitError(e.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div>
      <PageHeader title="피어 투표">{`세션: ${sessionId} / 팀: ${myTeam.teamName}`}</PageHeader>
      <div style={{ margin: '16px 0' }}>
        <p>
          팀원 기여율 합계가 100이 되도록 슬라이더를 조정하세요. 적합도는 본인을
          제외한 팀원에게만 표시됩니다.
        </p>
      </div>
      <div>
        <h3>기여율</h3>
        <ul style={{ listStyle: 'none', padding: 0 }}>
          {myTeam.members.map((member) => (
            <li key={member} style={{ marginBottom: 12 }}>
              <span style={{ display: 'inline-block', width: 80 }}>
                {member}
              </span>
              <input
                type="range"
                min={0}
                max={100}
                step={1}
                value={contribRates[member] ?? 0}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  setContribRates((prev) => ({ ...prev, [member]: val }));
                }}
                style={{ width: 160, marginRight: 8 }}
              />
              <span>{contribRates[member] ?? 0}%</span>
            </li>
          ))}
        </ul>
        <div style={{ fontWeight: 'bold', marginBottom: 8 }}>
          합계: {totalContrib} / 100
        </div>
        {!isValid && (
          <ErrorBanner error="기여율 합계가 100이 되어야 제출할 수 있습니다." />
        )}
      </div>
      <div>
        <h3>적합도</h3>
        <ul style={{ listStyle: 'none', padding: 0 }}>
          {myTeam.members
            .filter((m) => m !== myName)
            .map((member) => (
              <li key={member} style={{ marginBottom: 12 }}>
                <span style={{ display: 'inline-block', width: 80 }}>
                  {member}
                </span>
                <label style={{ marginRight: 8 }}>
                  <input
                    type="radio"
                    name={`fit-${member}`}
                    checked={isFits[member] === true}
                    onChange={() =>
                      setIsFits((prev) => ({ ...prev, [member]: true }))
                    }
                  />
                  예
                </label>
                <label>
                  <input
                    type="radio"
                    name={`fit-${member}`}
                    checked={isFits[member] === false}
                    onChange={() =>
                      setIsFits((prev) => ({ ...prev, [member]: false }))
                    }
                  />
                  아니오
                </label>
              </li>
            ))}
        </ul>
      </div>
      <div style={{ marginTop: 24 }}>
        {submitError && <ErrorBanner error={submitError} />}
        {submitSuccess && (
          <div style={{ color: '#388e3c', marginBottom: 12 }}>
            제출이 완료되었습니다.
          </div>
        )}
        <button
          onClick={handleSubmit}
          disabled={!isValid || isSubmitting}
          style={{
            padding: '8px 24px',
            fontSize: 16,
            background: isValid ? '#1976d2' : '#aaa',
            color: '#fff',
            border: 'none',
            borderRadius: 4,
            cursor: isValid ? 'pointer' : 'not-allowed',
          }}
        >
          {isSubmitting ? '제출 중...' : '제출'}
        </button>
      </div>
    </div>
  );
};

export default VotePage;
