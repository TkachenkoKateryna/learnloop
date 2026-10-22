import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Reflector } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import { AuthGuard } from './auth.guard';
import { SessionService } from '../session/session.service';
import { Session } from '../entities/session.entity';

interface MockRequest {
  headers: { authorization?: string };
  user?: unknown;
}

const HOUR_MS = 60 * 60 * 1000;

const tokenPayload = {
  sub: 'user-id',
  sid: 'session-id',
  firstName: 'Test',
  lastName: 'User',
};

const buildSession = (overrides: Partial<Session> = {}): Session =>
  ({
    id: 'session-id',
    userId: 'user-id',
    revokedAt: null,
    expiresAt: new Date(Date.now() + HOUR_MS),
    ...overrides,
  }) as Session;

describe('AuthGuard', () => {
  let guard: AuthGuard;
  let jwtService: { verifyAsync: jest.Mock };
  let configService: { get: jest.Mock };
  let reflector: { getAllAndOverride: jest.Mock };
  let sessionService: { get: jest.Mock };

  const createContext = (authorization?: string) => {
    const request: MockRequest = { headers: { authorization } };

    const context = {
      switchToHttp: () => ({
        getRequest: () => request,
      }),
      getHandler: () => undefined,
      getClass: () => undefined,
    } as unknown as ExecutionContext;

    return { context, request };
  };

  beforeEach(async () => {
    jwtService = { verifyAsync: jest.fn() };
    configService = {
      get: jest.fn().mockReturnValue({
        jwt: { accessTokenSecret: 'test-secret', accessTokenExpiresIn: '1m' },
      }),
    };
    reflector = { getAllAndOverride: jest.fn().mockReturnValue(false) };
    sessionService = { get: jest.fn().mockResolvedValue(buildSession()) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthGuard,
        { provide: JwtService, useValue: jwtService },
        { provide: ConfigService, useValue: configService },
        { provide: Reflector, useValue: reflector },
        { provide: SessionService, useValue: sessionService },
      ],
    }).compile();

    guard = module.get<AuthGuard>(AuthGuard);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('throws when no Authorization header is present', async () => {
    const { context } = createContext(undefined);

    await expect(guard.canActivate(context)).rejects.toThrow(
      UnauthorizedException,
    );
    expect(jwtService.verifyAsync).not.toHaveBeenCalled();
  });

  it('throws when the Authorization header is not a Bearer token', async () => {
    const { context } = createContext('Basic abc123');

    await expect(guard.canActivate(context)).rejects.toThrow(
      UnauthorizedException,
    );
    expect(jwtService.verifyAsync).not.toHaveBeenCalled();
  });

  it('throws when token verification fails', async () => {
    jwtService.verifyAsync.mockRejectedValue(new Error('invalid token'));
    const { context } = createContext('Bearer bad-token');

    await expect(guard.canActivate(context)).rejects.toThrow(
      UnauthorizedException,
    );
    expect(sessionService.get).not.toHaveBeenCalled();
  });

  it('verifies the token using the configured JWT secret', async () => {
    jwtService.verifyAsync.mockResolvedValue(tokenPayload);
    const { context } = createContext('Bearer good-token');

    await guard.canActivate(context);

    expect(configService.get).toHaveBeenCalledWith('auth');
    expect(jwtService.verifyAsync).toHaveBeenCalledWith('good-token', {
      secret: 'test-secret',
    });
  });

  it('attaches the decoded payload to the request and allows access while the session is active', async () => {
    jwtService.verifyAsync.mockResolvedValue(tokenPayload);
    const { context, request } = createContext('Bearer good-token');

    const result = await guard.canActivate(context);

    expect(result).toBe(true);
    expect(sessionService.get).toHaveBeenCalledWith('session-id');
    expect(request.user).toEqual(tokenPayload);
  });

  it('throws when the session was revoked (logout, password reset)', async () => {
    jwtService.verifyAsync.mockResolvedValue(tokenPayload);
    sessionService.get.mockResolvedValue(
      buildSession({ revokedAt: new Date() }),
    );
    const { context, request } = createContext('Bearer good-token');

    await expect(guard.canActivate(context)).rejects.toThrow(
      UnauthorizedException,
    );
    expect(request.user).toBeUndefined();
  });

  it('throws when the session has expired', async () => {
    jwtService.verifyAsync.mockResolvedValue(tokenPayload);
    sessionService.get.mockResolvedValue(
      buildSession({ expiresAt: new Date(Date.now() - HOUR_MS) }),
    );
    const { context } = createContext('Bearer good-token');

    await expect(guard.canActivate(context)).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('throws when the session does not exist', async () => {
    jwtService.verifyAsync.mockResolvedValue(tokenPayload);
    sessionService.get.mockResolvedValue(null);
    const { context } = createContext('Bearer good-token');

    await expect(guard.canActivate(context)).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('throws for a token without a session id, without looking one up', async () => {
    jwtService.verifyAsync.mockResolvedValue({
      ...tokenPayload,
      sid: undefined,
    });
    const { context } = createContext('Bearer old-token');

    await expect(guard.canActivate(context)).rejects.toThrow(
      UnauthorizedException,
    );
    expect(sessionService.get).not.toHaveBeenCalled();
  });

  it('lets a database error through instead of reporting an invalid token', async () => {
    jwtService.verifyAsync.mockResolvedValue(tokenPayload);
    sessionService.get.mockRejectedValue(new Error('connection refused'));
    const { context } = createContext('Bearer good-token');

    await expect(guard.canActivate(context)).rejects.toThrow(
      'connection refused',
    );
  });

  it('throws when the configured JWT secret is missing', async () => {
    configService.get.mockReturnValue(undefined);
    jwtService.verifyAsync.mockRejectedValue(new Error('invalid signature'));
    const { context } = createContext('Bearer good-token');

    await expect(guard.canActivate(context)).rejects.toThrow(
      UnauthorizedException,
    );
    expect(jwtService.verifyAsync).toHaveBeenCalledWith('good-token', {
      secret: undefined,
    });
  });

  it('allows access to a route marked @Public without checking a token', async () => {
    reflector.getAllAndOverride.mockReturnValue(true);
    const { context } = createContext(undefined);

    const result = await guard.canActivate(context);

    expect(result).toBe(true);
    expect(jwtService.verifyAsync).not.toHaveBeenCalled();
    expect(sessionService.get).not.toHaveBeenCalled();
  });
});
