import { applyDecorators, SetMetadata } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { minutes, Throttle, ThrottlerOptions } from '@nestjs/throttler';
import { normalizeEmail } from '../utils/normalize-email';

// Caps login attempts per IP across all emails, so one client can't spread
// password guesses over many accounts. Its 429s carry a suffixed header,
// Retry-After-login-ip.
export const LOGIN_IP_THROTTLER = 'login-ip';

const LOGIN_IP_THROTTLE_KEY = 'loginIpThrottle';

// Named throttlers run on every route by default, so this one skips routes
// that aren't marked with LoginThrottle().
export const loginIpThrottler = (
  reflector: Reflector,
  skip: boolean,
): ThrottlerOptions => ({
  name: LOGIN_IP_THROTTLER,
  ttl: minutes(1),
  limit: 20,
  // Replaces the module-wide skipIf rather than adding to it, so the global
  // skip has to be checked here too.
  skipIf: (context) =>
    skip ||
    !reflector.get<boolean | undefined>(
      LOGIN_IP_THROTTLE_KEY,
      context.getHandler(),
    ),
});

// Login attempts are counted per IP + email, so each account gets its own
// budget and one user mistyping can't lock out others behind the same IP.
const loginTracker = (req: Record<string, any>): string => {
  const email = (req.body as { email?: unknown } | undefined)?.email;
  const normalizedEmail =
    typeof email === 'string' ? normalizeEmail(email) : '';

  return `${String(req.ip)}:${normalizedEmail}`;
};

export const LoginThrottle = () =>
  applyDecorators(
    Throttle({
      default: { limit: 5, ttl: minutes(1), getTracker: loginTracker },
    }),
    SetMetadata(LOGIN_IP_THROTTLE_KEY, true),
  );
