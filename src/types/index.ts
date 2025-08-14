// 이 파일은 애플리케이션에서 사용하는 TypeScript 인터페이스와 타입을 정의합니다.

export interface User {
  id: string;
  email: string;
  isFaculty: boolean;
}

export interface Session {
  id: number;
  name: string;
  description?: string;
  created_at: string;
}

export interface SessionNew {
  id: number;
  name: string;
  description?: string;
  created_at: string;
}
export interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: (email: string) => Promise<void>;
  signOut: () => Promise<void>;
}
