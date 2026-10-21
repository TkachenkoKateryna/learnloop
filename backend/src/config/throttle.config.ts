import { registerAs } from '@nestjs/config';
import { ThrottleConfig } from './config.types';

export const throttleConfig = registerAs('throttle', (): ThrottleConfig => ({
  ttl: Number(process.env.THROTTLE_TTL),
  limit: Number(process.env.THROTTLE_LIMIT),
  // Always on in the app. e2e tests replace ConfigService and switch it off
  // in test/config/test.config.ts; throttling.e2e-spec.ts turns it back on.
  skip: false,
}));
