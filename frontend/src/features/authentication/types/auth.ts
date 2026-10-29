export interface LoginRequest {
  email: string;
  password: string;
  rememberMe: boolean;
}

export interface RegisterRequest {
  email: string;
  firstName: string;
  lastName: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ResetPasswordRequest {
  token: string;
  newPassword: string;
}

export type Role = 'admin' | 'librarian' | 'member';

// Keep in sync with backend/src/authorization/permissions.ts.
export type Permission =
  | 'books:read'
  | 'books:create'
  | 'books:update'
  | 'books:delete'
  | 'users:read'
  | 'users:create'
  | 'users:update'
  | 'users:delete';

export interface UserAccount {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  createdAt: string;
  updatedAt: string;
}

export interface User extends UserAccount {
  role: Role;
  permissions: Permission[];
}
