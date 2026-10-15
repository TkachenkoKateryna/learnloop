import { api } from '../../../lib/apiClient';
import type {
  ForgotPasswordRequest,
  LoginRequest,
  LoginResponse,
  RegisterRequest,
  ResetPasswordRequest,
  User,
} from '../types/auth';

const basePath = 'auth';

export class AuthService {
  login(credentials: LoginRequest): Promise<User> {
    return this.startSession(
      api.post<LoginResponse>(`${basePath}/login`, credentials),
    );
  }

  register(payload: RegisterRequest): Promise<User> {
    return api.post<User>(`${basePath}/register`, payload);
  }

  refresh(): Promise<User> {
    return this.startSession(api.post<LoginResponse>(`${basePath}/refresh`));
  }

  logout(): Promise<void> {
    return api.post<void>(`${basePath}/logout`).finally(() => {
      api.setAccessToken(null);
    });
  }

  profile(): Promise<User> {
    return api.get<User>(`${basePath}/profile`);
  }

  forgotPassword(payload: ForgotPasswordRequest): Promise<void> {
    return api.post<void>(`${basePath}/forgot-password`, payload);
  }

  resetPassword(payload: ResetPasswordRequest): Promise<void> {
    return api.post<void>(`${basePath}/reset-password`, payload);
  }

  private async startSession(request: Promise<LoginResponse>): Promise<User> {
    const { accessToken } = await request;
    api.setAccessToken(accessToken);

    try {
      return await this.profile();
    } catch (error) {
      api.setAccessToken(null);
      throw error;
    }
  }
}

export const authService = new AuthService();
