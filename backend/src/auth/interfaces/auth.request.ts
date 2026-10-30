import { Role } from '../../authorization/role.enum';
import { AccessTokenPayload } from './jwt-payload';

export interface RequestUser extends AccessTokenPayload {
  role: Role;
}

export interface AuthRequest {
  user: RequestUser;
}
