import { registerAs } from '@nestjs/config';
import type { StringValue } from 'ms';
import { AuthConfig } from './config.types';

export const authConfig = registerAs('auth', (): AuthConfig => ({
  jwt: {
    accessTokenSecret: process.env.JWT_ACCESS_SECRET as string,
    accessTokenExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN as StringValue,
    refreshTokenSecret: process.env.JWT_REFRESH_SECRET as string,
    refreshTokenExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN as StringValue,
    refreshTokenRememberMeExpiresIn: process.env
      .JWT_REFRESH_REMEMBER_ME_EXPIRES_IN as StringValue,
  },
  passwordReset: {
    tokenExpiresIn: process.env.PASSWORD_RESET_TOKEN_EXPIRES_IN as StringValue,
    resetUrl: process.env.PASSWORD_RESET_URL as string,
  },
}));
