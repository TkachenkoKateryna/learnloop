import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import { createHash } from 'crypto';
import { AuthService } from './auth.service';
import { UserService } from '../user.service';
import { SessionService } from '../session/session.service';
import { PasswordService } from '../password/password.service';
import { Session } from '../entities/session.entity';
import { User } from '../entities/user.entity';

const DAY = 24 * 60 * 60 * 1000;

const jwtConfig = {
  accessTokenSecret: 'access-secret',
  accessTokenExpiresIn: '15m',
  refreshTokenSecret: 'refresh-secret',
  refreshTokenExpiresIn: '1d',
  refreshTokenRememberMeExpiresIn: '30d',
};

const sha256 = (value: string) =>
  createHash('sha256').update(value).digest('hex');

describe('AuthService', () => {
  let service: AuthService;
  let sessions: Map<string, Session>;

  const credentials = {
    email: 'test@example.com',
    password: 'Password1',
    rememberMe: false,
  };

  const onlySession = () => [...sessions.values()][0];

  beforeEach(async () => {
    sessions = new Map();

    const passwordService = new PasswordService();
    const user = {
      id: 'user-1',
      firstName: 'Test',
      lastName: 'User',
      email: credentials.email,
      password: await passwordService.hash(credentials.password),
    } as User;

    const userService = {
      findOneByEmail: jest.fn((email: string) =>
        Promise.resolve(email === user.email ? user : null),
      ),
      findOne: jest.fn((id: string) =>
        Promise.resolve(id === user.id ? user : null),
      ),
    };

    const sessionService = {
      create: jest.fn((data: Partial<Session> & { id: string }) => {
        const session = { ...data, revokedAt: null } as Session;
        sessions.set(session.id, session);
        return Promise.resolve(session);
      }),
      get: jest.fn((id: string) => Promise.resolve(sessions.get(id) ?? null)),
      rotateRefreshToken: jest.fn(
        (id: string, data: Pick<Session, 'refreshTokenHash' | 'expiresAt'>) => {
          Object.assign(sessions.get(id)!, data);
          return Promise.resolve();
        },
      ),
      revoke: jest.fn((id: string) => {
        sessions.get(id)!.revokedAt = new Date();
        return Promise.resolve();
      }),
    };

    const module = await Test.createTestingModule({
      imports: [JwtModule.register({})],
      providers: [
        AuthService,
        PasswordService,
        { provide: UserService, useValue: userService },
        { provide: SessionService, useValue: sessionService },
        {
          provide: ConfigService,
          useValue: { getOrThrow: () => ({ jwt: jwtConfig }) },
        },
      ],
    }).compile();

    service = module.get(AuthService);
  });

  describe('login', () => {
    it('stores a SHA-256 hash of the refresh token, never the token itself', async () => {
      const { refreshToken } = await service.login(credentials);

      expect(onlySession().refreshTokenHash).toBe(sha256(refreshToken));
      expect(onlySession().refreshTokenHash).not.toBe(refreshToken);
    });

    it.each([
      ['not remembered', false, 1, undefined],
      ['remembered', true, 30, 30 * DAY],
    ])(
      'sets session lifetime and cookie maxAge when %s',
      async (_label, rememberMe, days, cookieMaxAge) => {
        const before = Date.now();

        const result = await service.login({ ...credentials, rememberMe });

        expect(onlySession().rememberMe).toBe(rememberMe);
        expect(
          Math.abs(onlySession().expiresAt.getTime() - (before + days * DAY)),
        ).toBeLessThan(5000);
        expect(result.refreshTokenCookieMaxAge).toBe(cookieMaxAge);
      },
    );

    it.each([
      ['an unknown email', { ...credentials, email: 'nobody@example.com' }],
      ['a wrong password', { ...credentials, password: 'WrongPassword1' }],
    ])('rejects %s', async (_label, attempt) => {
      await expect(service.login(attempt)).rejects.toThrow(
        UnauthorizedException,
      );
      expect(sessions.size).toBe(0);
    });
  });

  describe('refresh', () => {
    it('rotates the refresh token and keeps the remember-me choice', async () => {
      const first = await service.login({ ...credentials, rememberMe: true });

      const second = await service.refresh(first.refreshToken);

      expect(second.refreshToken).not.toBe(first.refreshToken);
      expect(onlySession().refreshTokenHash).toBe(sha256(second.refreshToken));
      expect(second.refreshTokenCookieMaxAge).toBe(30 * DAY);
    });

    it('revokes the session when an already-rotated token is replayed', async () => {
      const first = await service.login(credentials);
      const second = await service.refresh(first.refreshToken);

      await expect(service.refresh(first.refreshToken)).rejects.toThrow(
        UnauthorizedException,
      );

      expect(onlySession().revokedAt).not.toBeNull();
      await expect(service.refresh(second.refreshToken)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it.each([
      ['a missing token', undefined],
      ['a malformed token', 'not-a-jwt'],
    ])('rejects %s', async (_label, token) => {
      await expect(service.refresh(token)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('rejects a token whose session was revoked by logout', async () => {
      const { refreshToken } = await service.login(credentials);

      await service.logout(refreshToken);

      await expect(service.refresh(refreshToken)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('logout', () => {
    it('does nothing for a missing or invalid token', async () => {
      await expect(service.logout(undefined)).resolves.toBeUndefined();
      await expect(service.logout('not-a-jwt')).resolves.toBeUndefined();
    });
  });
});
