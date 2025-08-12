import React from "react";
import { supabase } from "./supabaseClient";
import { useAuth } from "./useAuth";

const Login: React.FC = () => {
  const { session, loading } = useAuth();

  if (loading) return <div>로딩 중...</div>;

  if (!session) {
    return (
      <button
        onClick={() => supabase.auth.signInWithOAuth({ provider: "google" })}
      >
        Google로 로그인
      </button>
    );
  }

  return (
    <div>
      <span>{session.user.email} 님 환영합니다.</span>
      <button onClick={() => supabase.auth.signOut()}>로그아웃</button>
    </div>
  );
};

export default Login;
