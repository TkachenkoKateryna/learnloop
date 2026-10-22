import { AccessTokenPayload } from './jwt-payload';

export interface AuthRequest {
  user: AccessTokenPayload;
}
