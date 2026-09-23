import * as Joi from 'joi';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import type { StringValue } from 'ms';

export interface AuthConfig {
  jwt: {
    accessTokenSecret: string;
    accessTokenExpiresIn: StringValue;
    refreshTokenSecret: string;
    refreshTokenExpiresIn: StringValue;
    refreshTokenRememberMeExpiresIn: StringValue;
  };
  passwordReset: {
    tokenExpiresIn: StringValue;
    resetUrl: string;
  };
}

export interface MailConfig {
  sendgridApiKey: string;
  fromEmail: string;
  fromName: string;
}

export interface ConfigType {
  database: TypeOrmModuleOptions;
  auth: AuthConfig;
  mail: MailConfig;
}

export const appConfigSchema = Joi.object({
  DB_HOST: Joi.string().default('localhost'),
  DB_PORT: Joi.number().default(5433),
  DB_USER: Joi.string().required(),
  DB_PASSWORD: Joi.string().required(),
  DB_NAME: Joi.string().required(),
  DB_SYNC: Joi.number().valid(0, 1).required(),
  JWT_ACCESS_SECRET: Joi.string().required(),
  JWT_ACCESS_EXPIRES_IN: Joi.string().required(),
  JWT_REFRESH_SECRET: Joi.string().required(),
  JWT_REFRESH_EXPIRES_IN: Joi.string().required(),
  JWT_REFRESH_REMEMBER_ME_EXPIRES_IN: Joi.string().required(),
  PASSWORD_RESET_TOKEN_EXPIRES_IN: Joi.string().default('30m'),
  PASSWORD_RESET_URL: Joi.string().uri().required(),
  SENDGRID_API_KEY: Joi.string().required(),
  MAIL_FROM_EMAIL: Joi.string().email().required(),
  MAIL_FROM_NAME: Joi.string().default('LearnLoop'),
});
