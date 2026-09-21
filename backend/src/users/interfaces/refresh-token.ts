import { Request } from 'express';
import { StringValue } from 'ms';

export interface RefreshTokenRequest extends Request {
  cookies: {
    refreshToken?: string;
  };
}

export interface RefreshTokenLifetime {
  expiresIn: StringValue;
  expiresAt: Date;
  cookieMaxAge?: number;
}
