import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import useSWR from 'swr';
import { supabase } from '../../utils/supabaseClient';
import { Session } from '../../types';
import useAuth from '../../hooks/useAuth';
import PageHeader from '../../components/common/PageHeader';
import ErrorBanner from '../../components/common/ErrorBanner';
import Spinner from '../../components/common/Spinner';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import SessionList from '../../components/sessions/SessionList';
import SessionFormModal from '../../components/sessions/SessionFormModal';
import { FaPlus } from 'react-icons/fa';
import LogoutButton from '../../components/common/LogoutButton';

const fetchSessions = async (): Promise<Session[]> => {
  const { data, error } = await supabase
    .from('sessions')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(100);
  if (error) throw error;
  return data || [];
};

const SessionsPage: React.FC = () => {
  const { user, loading, error: authError } = useAuth();
  const router = useRouter();
  const {
    data: sessions,
    error,
    isLoading,
    mutate,
  } = useSWR<Session[]>(['sessions'], fetchSessions);
  const [formOpen, setFormOpen] = useState(false);
  const [editSession, setEditSession] = useState<Session | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [actionError, setActionError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  interface SessionFormValues {
    name: string;
    description?: string;
    teams?: any;
  }

  const handleCreateOrEdit = async (values: SessionFormValues) => {
    // 중복 제출 방지
    if (isSubmitting) return;

    setIsSubmitting(true);
    setActionError('');

    try {
      let sessionId = editSession?.id ?? null;

      // 수정: 업데이트된 row를 반환받도록 .select().single() 사용
      if (editSession) {
        const { data, error } = await supabase
          .from('sessions')
          .update({ name: values.name, description: values.description })
          .eq('id', editSession.id)
          .select()
          .single();
        if (error) throw error;
        sessionId = data?.id ?? sessionId;
        setEditSession(null);
      } else {
        const { data, error } = await supabase
          .from('sessions')
          .insert({ name: values.name, description: values.description })
          .select()
          .single();
        if (error) throw error;
        sessionId = data?.id ?? sessionId;
      }

      // 팀 정보가 있으면 API로 전달하여 DB 반영
      if (values.teams && sessionId) {
        try {
          const updateRes = await fetch('/api/teams/update', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sessionId, teams: values.teams }),
          });
          const updateJson = await updateRes.json().catch(() => ({}));
          if (!updateRes.ok) {
            throw new Error(updateJson.error || '팀 DB 반영 실패');
          }
        } catch (teamError: any) {
          setActionError(
            `세션은 저장되었지만 팀 구성 저장 중 오류가 발생했습니다: ${teamError?.message ?? String(teamError)}`,
          );
          // 목록만 갱신하고 모달은 닫지 않음
          await mutate();
          return;
        }
      }

      // 모든 작업 성공 시 모달 닫고 목록 갱신
      setFormOpen(false);
      await mutate();
    } catch (e: any) {
      setActionError(e?.message ?? String(e));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (deleteId == null) return;
    try {
      const { error } = await supabase
        .from('sessions')
        .delete()
        .eq('id', deleteId);
      if (error) throw error;
      await mutate();
      setDeleteId(null);
    } catch (e: any) {
      setActionError(e?.message ?? String(e));
    }
  };

  useEffect(() => {
    if (!loading && user) {
      if (!user.isFaculty) {
        router.replace('/');
      }
    } else if (!loading && !user) {
      router.replace('/');
    }
  }, [loading, user, router]);

  if (loading) return <Spinner />;
  if (authError) return <ErrorBanner error={authError} />;
  if (!user || !user.isFaculty) return null;

  return (
    <>
      <div
        style={{
          maxWidth: 800,
          margin: '0 auto',
          padding: '24px 16px',
          paddingBottom: 120,
        }}
      >
        <PageHeader
          title={
            <>
              GCS 피어 리뷰 - 세션 리스트
              <button
                onClick={() => {
                  setEditSession(null);
                  setFormOpen(true);
                }}
                style={{
                  background: '#1976d2',
                  color: 'white',
                  border: 'none',
                  borderRadius: '50%',
                  width: 40,
                  height: 40,
                  fontSize: 18,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 4px 12px rgba(25, 118, 210, 0.25)',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  marginLeft: 8,
                }}
                aria-label="세션 추가"
              >
                <FaPlus />
              </button>
            </>
          }
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <LogoutButton />
          </div>
        </PageHeader>

        {actionError && <ErrorBanner error={actionError} />}

        {isLoading ? (
          <div style={{ textAlign: 'center', padding: 40 }}>
            <Spinner />
          </div>
        ) : error ? (
          <ErrorBanner error={error.message} />
        ) : sessions && sessions.length > 0 ? (
          <SessionList
            sessions={sessions}
            onSelect={() => {}}
            onEdit={(session) => {
              setEditSession(session);
              setFormOpen(true);
            }}
            onDelete={(session) => setDeleteId(session.id)}
          />
        ) : (
          <div style={{ textAlign: 'center', color: '#888', margin: '40px 0' }}>
            세션이 없습니다. 우측 상단 버튼을 눌러 생성하세요.
          </div>
        )}

        <SessionFormModal
          open={formOpen}
          initial={editSession || undefined}
          onSubmit={handleCreateOrEdit}
          onClose={() => {
            if (!isSubmitting) {
              setFormOpen(false);
              setEditSession(null);
              setActionError('');
            }
          }}
        />

        <ConfirmDialog
          open={!!deleteId}
          title="세션 삭제"
          description="해당 세션 및 관련 팀, 리뷰 데이터가 모두 삭제됩니다. 정말 삭제하시겠습니까?"
          onConfirm={handleDelete}
          onCancel={() => setDeleteId(null)}
        />
      </div>

      <div
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          width: '100%',
          background: 'rgba(255,255,255,0.98)',
          borderTop: '1px solid #eee',
          zIndex: 9999,
          padding: '10px 0',
        }}
      >
        <div
          style={{
            maxWidth: 800,
            margin: '0 auto',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            color: '#555',
            fontSize: 15,
            fontWeight: 500,
            letterSpacing: 1,
            opacity: 0.85,
            padding: '8px 16px',
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
    </>
  );
};

export default SessionsPage;
