import {
  ConflictException,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import { createHash } from 'crypto';
import { DataSource, EntityManager } from 'typeorm';
import { AuthService, LAST_ADMIN_MESSAGE } from './auth.service';
import { UserService } from '../user.service';
import { SessionService } from '../session/session.service';
import { PasswordService } from '../password/password.service';
import { PasswordResetService } from '../password-reset/password-reset.service';
import { MailService } from '../../mail/mail.service';
import { Session } from '../entities/session.entity';
import { User } from '../entities/user.entity';
import { Role } from '../../authorization/role.enum';

const DAY = 24 * 60 * 60 * 1000;

const jwtConfig = {
  accessTokenSecret: 'access-secret',
  accessTokenExpiresIn: '15m',
  refreshTokenSecret: 'refresh-secret',
  refreshTokenExpiresIn: '1d',
  refreshTokenRememberMeExpiresIn: '30d',
};

const passwordResetConfig = {
  tokenExpiresIn: '30m',
  resetUrl: 'https://app.example.com/reset-password',
};

const sha256 = (value: string) =>
  createHash('sha256').update(value).digest('hex');

const flushBackgroundWork = () =>
  new Promise((resolve) => setImmediate(resolve));

const decodeJwtPayload = (token: string): Record<string, unknown> =>
  JSON.parse(
    Buffer.from(token.split('.')[1], 'base64url').toString(),
  ) as Record<string, unknown>;

describe('AuthService', () => {
  let service: AuthService;
  let sessions: Map<string, Session>;
  let passwordResetService: {
    createToken: jest.Mock<Promise<string>, [string]>;
    consumeToken: jest.Mock<Promise<string | null>, [string, EntityManager?]>;
    revokeAllForUser: jest.Mock<Promise<void>, [string, EntityManager?]>;
  };
  let mailService: {
    sendPasswordResetEmail: jest.Mock<Promise<void>, [string, string]>;
  };
  let userService: {
    findOneByEmail: jest.Mock<Promise<User | null>, [string]>;
    findOne: jest.Mock<Promise<User | null>, [string]>;
    updatePasswordHash: jest.Mock<
      Promise<void>,
      [string, string, EntityManager?]
    >;
    updateRole: jest.Mock<Promise<void>, [string, Role, EntityManager?]>;
    lockAdminIds: jest.Mock<Promise<string[]>, [EntityManager]>;
  };
  let sessionService: {
    create: jest.Mock;
    get: jest.Mock;
    rotateRefreshToken: jest.Mock;
    revoke: jest.Mock;
    revokeAllForUser: jest.Mock<Promise<void>, [string, EntityManager?]>;
  };
  const transactionManager = {} as EntityManager;
  let dataSource: {
    transaction: jest.Mock<
      Promise<unknown>,
      [(manager: EntityManager) => Promise<unknown>]
    >;
  };

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

    userService = {
      findOneByEmail: jest.fn((email: string) =>
        Promise.resolve(email === user.email ? user : null),
      ),
      findOne: jest.fn((id: string) =>
        Promise.resolve(id === user.id ? user : null),
      ),
      updatePasswordHash: jest.fn<
        Promise<void>,
        [string, string, EntityManager?]
      >(() => Promise.resolve()),
      updateRole: jest.fn<Promise<void>, [string, Role, EntityManager?]>(() =>
        Promise.resolve(),
      ),
      lockAdminIds: jest.fn<Promise<string[]>, [EntityManager]>(() =>
        Promise.resolve([]),
      ),
    };

    sessionService = {
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
      revokeAllForUser: jest.fn((userId: string) => {
        for (const session of sessions.values()) {
          if (session.userId === userId) {
            session.revokedAt = new Date();
          }
        }
        return Promise.resolve();
      }),
    };

    passwordResetService = {
      createToken: jest.fn((userId: string) =>
        Promise.resolve(`token-for-${userId}`),
      ),
      consumeToken: jest.fn((token: string) =>
        Promise.resolve(token === 'valid-token' ? user.id : null),
      ),
      revokeAllForUser: jest.fn<Promise<void>, [string, EntityManager?]>(() =>
        Promise.resolve(),
      ),
    };

    dataSource = {
      transaction: jest.fn(
        (run: (manager: EntityManager) => Promise<unknown>) =>
          run(transactionManager),
      ),
    };

    mailService = {
      sendPasswordResetEmail: jest.fn<Promise<void>, [string, string]>(() =>
        Promise.resolve(),
      ),
    };

    const module = await Test.createTestingModule({
      imports: [JwtModule.register({})],
      providers: [
        AuthService,
        PasswordService,
        { provide: UserService, useValue: userService },
        { provide: SessionService, useValue: sessionService },
        { provide: PasswordResetService, useValue: passwordResetService },
        { provide: MailService, useValue: mailService },
        { provide: DataSource, useValue: dataSource },
        {
          provide: ConfigService,
          useValue: {
            getOrThrow: () => ({
              jwt: jwtConfig,
              passwordReset: passwordResetConfig,
            }),
          },
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

    it('ties the access token to the new session', async () => {
      const { accessToken } = await service.login(credentials);

      expect(decodeJwtPayload(accessToken)).toMatchObject({
        sub: 'user-1',
        sid: onlySession().id,
      });
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

    it('issues an access token for the same session', async () => {
      const first = await service.login(credentials);

      const second = await service.refresh(first.refreshToken);

      expect(decodeJwtPayload(second.accessToken).sid).toBe(onlySession().id);
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

  describe('forgotPassword', () => {
    it('creates a reset token and emails a reset link for a known email', async () => {
      await service.forgotPassword(credentials.email);
      await flushBackgroundWork();

      expect(passwordResetService.createToken).toHaveBeenCalledWith('user-1');
      expect(mailService.sendPasswordResetEmail).toHaveBeenCalledWith(
        credentials.email,
        `${passwordResetConfig.resetUrl}?token=token-for-user-1`,
      );
    });

    it('resolves without creating a token or sending an email for an unknown email', async () => {
      await expect(
        service.forgotPassword('nobody@example.com'),
      ).resolves.toBeUndefined();

      expect(passwordResetService.createToken).not.toHaveBeenCalled();
      expect(mailService.sendPasswordResetEmail).not.toHaveBeenCalled();
    });

    it('resolves without waiting for the email, so known emails answer as fast as unknown ones', async () => {
      mailService.sendPasswordResetEmail.mockReturnValue(new Promise(() => {}));

      await expect(
        service.forgotPassword(credentials.email),
      ).resolves.toBeUndefined();
    });

    it('still resolves and logs the error when the email fails to send', async () => {
      const logError = jest
        .spyOn(Logger.prototype, 'error')
        .mockImplementation(() => {});
      mailService.sendPasswordResetEmail.mockRejectedValue(
        new Error('SendGrid is down'),
      );

      await expect(
        service.forgotPassword(credentials.email),
      ).resolves.toBeUndefined();
      await flushBackgroundWork();

      expect(logError).toHaveBeenCalledWith(
        'Failed to send password reset email',
        expect.any(Error),
      );
      logError.mockRestore();
    });
  });

  describe('resetPassword', () => {
    it('updates the password and revokes all sessions for a valid token', async () => {
      const { refreshToken } = await service.login(credentials);

      await service.resetPassword('valid-token', 'NewPassword1');

      const [userId, passwordHash] =
        userService.updatePasswordHash.mock.calls[0];
      expect(userId).toBe('user-1');
      await expect(
        new PasswordService().verify('NewPassword1', passwordHash),
      ).resolves.toBe(true);
      expect(passwordResetService.revokeAllForUser).toHaveBeenCalledWith(
        'user-1',
        transactionManager,
      );
      await expect(service.refresh(refreshToken)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('runs every write in a single transaction', async () => {
      await service.resetPassword('valid-token', 'NewPassword1');

      expect(dataSource.transaction).toHaveBeenCalledTimes(1);
      expect(passwordResetService.consumeToken).toHaveBeenCalledWith(
        'valid-token',
        transactionManager,
      );
      expect(userService.updatePasswordHash).toHaveBeenCalledWith(
        'user-1',
        expect.any(String),
        transactionManager,
      );
      expect(passwordResetService.revokeAllForUser).toHaveBeenCalledWith(
        'user-1',
        transactionManager,
      );
      expect(sessionService.revokeAllForUser).toHaveBeenCalledWith(
        'user-1',
        transactionManager,
      );
    });

    it('rejects an invalid or expired token without touching the account', async () => {
      await expect(
        service.resetPassword('bad-token', 'NewPassword1'),
      ).rejects.toThrow(UnauthorizedException);

      expect(userService.updatePasswordHash).not.toHaveBeenCalled();
      expect(sessionService.revokeAllForUser).not.toHaveBeenCalled();
    });
  });

  describe('changeRole', () => {
    const member = { id: 'user-1', role: Role.Member } as User;

    it('updates the role and revokes every session in one transaction', async () => {
      const { refreshToken } = await service.login(credentials);

      await expect(service.changeRole(member, Role.Librarian)).resolves.toBe(
        true,
      );

      expect(dataSource.transaction).toHaveBeenCalledTimes(1);
      expect(userService.updateRole).toHaveBeenCalledWith(
        'user-1',
        Role.Librarian,
        transactionManager,
      );
      expect(sessionService.revokeAllForUser).toHaveBeenCalledWith(
        'user-1',
        transactionManager,
      );
      await expect(service.refresh(refreshToken)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('leaves the user signed in when the role is unchanged', async () => {
      await expect(service.changeRole(member, Role.Member)).resolves.toBe(
        false,
      );

      expect(dataSource.transaction).not.toHaveBeenCalled();
      expect(userService.updateRole).not.toHaveBeenCalled();
      expect(sessionService.revokeAllForUser).not.toHaveBeenCalled();
    });

    describe('last admin', () => {
      const admin = { id: 'admin-1', role: Role.Admin } as User;

      it('refuses to demote the only admin and changes nothing', async () => {
        userService.lockAdminIds.mockResolvedValue(['admin-1']);

        await expect(service.changeRole(admin, Role.Librarian)).rejects.toThrow(
          new ConflictException(LAST_ADMIN_MESSAGE),
        );

        expect(userService.lockAdminIds).toHaveBeenCalledWith(
          transactionManager,
        );
        expect(userService.updateRole).not.toHaveBeenCalled();
        expect(sessionService.revokeAllForUser).not.toHaveBeenCalled();
      });

      it('demotes an admin when another admin remains', async () => {
        userService.lockAdminIds.mockResolvedValue(['admin-1', 'admin-2']);

        await expect(service.changeRole(admin, Role.Member)).resolves.toBe(
          true,
        );

        expect(userService.updateRole).toHaveBeenCalledWith(
          'admin-1',
          Role.Member,
          transactionManager,
        );
      });

      it('checks the locked rows, not the role passed in', async () => {
        const stale = { id: 'admin-1', role: Role.Member } as User;
        userService.lockAdminIds.mockResolvedValue(['admin-1']);

        await expect(service.changeRole(stale, Role.Librarian)).rejects.toThrow(
          ConflictException,
        );
      });

      it('promotes to admin without locking the admins', async () => {
        await expect(service.changeRole(member, Role.Admin)).resolves.toBe(
          true,
        );

        expect(userService.lockAdminIds).not.toHaveBeenCalled();
        expect(userService.updateRole).toHaveBeenCalledWith(
          'user-1',
          Role.Admin,
          transactionManager,
        );
      });
    });
  });

  describe('logout', () => {
    it('does nothing for a missing or invalid token', async () => {
      await expect(service.logout(undefined)).resolves.toBeUndefined();
      await expect(service.logout('not-a-jwt')).resolves.toBeUndefined();
    });
  });
});
