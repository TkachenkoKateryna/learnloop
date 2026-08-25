import { registerAs } from '@nestjs/config';
import { AppConfig } from './config.types';

export const appConfig = registerAs('app', (): AppConfig => ({
  messagePrefix: process.env.APP_MESSAGE_PREFIX ?? '',
}));
