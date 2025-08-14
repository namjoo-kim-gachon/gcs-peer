import React, { useState } from 'react';
import useSWR from 'swr';
import { supabase } from '../../utils/supabaseClient';
import { Session } from '../../types';
import PageHeader from '../../components/common/PageHeader';
import EmptyState from '../../components/common/EmptyState';
import ErrorBanner from '../../components/common/ErrorBanner';
import Spinner from '../../components/common/Spinner';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import SessionList from '../../components/sessions/SessionList';
import SessionFormModal from '../../components/sessions/SessionFormModal';

const fetchSessions = async () => {
  const { data, error } = await supabase
    .from('sessions')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(100);
  if (error) throw error;
  return data;
};

const SessionsPage: React.FC = () => {
  const {
    data: sessions,
    error,
    isLoading,
    mutate,
  } = useSWR(['sessions'], fetchSessions);
  const [formOpen, setFormOpen] = useState(false);
  const [editSession, setEditSession] = useState<Session | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [actionError, setActionError] = useState('');

  interface SessionFormValues {
    name: string;
    description?: string;
    teams?: any;
  }
  const handleCreateOrEdit = async (values: SessionFormValues) => {
    console.log('폼 입력값:', values);
    try {
      let sessionId = editSession?.id;
      // 세션 저장
      if (editSession) {
        const { error } = await supabase
          .from('sessions')
          .update({ name: values.name, description: values.description })
          .eq('id', editSession.id);
        if (error) throw error;
        sessionId = editSession.id;
        setEditSession(null);
      } else {
        const { data, error } = await supabase
          .from('sessions')
          .insert({ name: values.name, description: values.description })
          .select()
          .single();
        if (error) throw error;
        sessionId = data?.id;
        setFormOpen(false);
      }
      // 팀 정보가 있으면 DB 반영
      if (values.teams && sessionId) {
        const updateRes = await fetch('/api/teams/update', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId,
            teams: values.teams,
          }),
        });
        const updateJson = await updateRes.json();
        console.log('팀 업데이트 결과:', updateJson);
        if (updateRes.status !== 200) {
          throw new Error(updateJson.error || '팀 DB 반영 실패');
        }
      }
      mutate();
    } catch (e: any) {
      setActionError(e.message);
    }
  };
  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      const { error } = await supabase
        .from('sessions')
        .delete()
        .eq('id', deleteId);
      if (error) throw error;
      mutate();
      setDeleteId(null);
    } catch (e: any) {
      setActionError(e.message);
    }
  };

  return (
    <div style={{ maxWidth: 600, margin: '0 auto', padding: 24 }}>
      <PageHeader title="세션 목록">
        <button onClick={() => setFormOpen(true)} style={{ float: 'right' }}>
          + 세션 생성
        </button>
      </PageHeader>
      {actionError && <ErrorBanner error={actionError} />}
      {isLoading ? (
        <Spinner />
      ) : error ? (
        <ErrorBanner error={error.message} />
      ) : sessions && sessions.length > 0 ? (
        <SessionList
          sessions={sessions}
          onSelect={() => {}}
          onEdit={(session) => setEditSession(session)}
          onDelete={(session) => setDeleteId(session.id)}
        />
      ) : (
        <EmptyState message="세션이 없습니다." />
      )}
      <SessionFormModal
        open={formOpen || !!editSession}
        initial={editSession || undefined}
        onSubmit={handleCreateOrEdit}
        onClose={() => {
          setFormOpen(false);
          setEditSession(null);
        }}
      />
      <ConfirmDialog
        open={!!deleteId}
        title="세션 삭제"
        description="정말 삭제하시겠습니까?"
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  );
};

export default SessionsPage;
