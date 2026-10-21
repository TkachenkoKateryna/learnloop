import { registerAs } from '@nestjs/config';
import { CorsConfig } from './config.types';

export const corsConfig = registerAs('cors', (): CorsConfig => ({
  origins: (process.env.CORS_ORIGINS as string)
    .split(',')
    .map((origin) => origin.trim()),
}));
