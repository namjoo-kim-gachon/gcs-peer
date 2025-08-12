import React from "react";
import { AuthProvider } from "./AuthContext";
import { useAuth } from "./useAuth";
import Login from "./Login";

const Dashboard: React.FC = () => {
  return (
    <div>
      <h1>대시보드</h1>
      <p>로그인된 사용자만 볼 수 있습니다.</p>
    </div>
  );
};

const App: React.FC = () => {
  const { session, loading } = useAuth();
  if (loading) return <div>로딩 중...</div>;
  return session ? <Dashboard /> : <Login />;
};

const Root: React.FC = () => (
  <AuthProvider>
    <App />
  </AuthProvider>
);

export default Root;
