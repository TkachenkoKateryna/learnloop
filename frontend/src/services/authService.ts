import { api } from '../adapters/api';
import type {
  LoginRequest,
  LoginResponse,
  RegisterRequest,
  User,
} from '../types/auth';

const basePath = 'auth';

export class AuthService {
  login(credentials: LoginRequest): Promise<LoginResponse> {
    return this.startSession(
      api.post<LoginResponse>(`${basePath}/login`, credentials),
    );
  }

  register(payload: RegisterRequest): Promise<User> {
    return api.post<User>(`${basePath}/register`, payload);
  }

  refresh(): Promise<LoginResponse> {
    return this.startSession(api.post<LoginResponse>(`${basePath}/refresh`));
  }

  logout(): Promise<void> {
    return api.post<void>(`${basePath}/logout`).finally(() => {
      api.removeHeader('Authorization');
    });
  }

  profile(): Promise<User> {
    return api.get<User>(`${basePath}/profile`);
  }

  private startSession(
    request: Promise<LoginResponse>,
  ): Promise<LoginResponse> {
    return request.then((response) => {
      api.setHeader('Authorization', `Bearer ${response.accessToken}`);
      return response;
    });
  }
}

export const authService = new AuthService();
