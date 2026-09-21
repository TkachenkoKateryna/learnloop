import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Reflector } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import { AuthGuard } from './auth.guard';

interface MockRequest {
  headers: { authorization?: string };
  user?: unknown;
}

describe('AuthGuard', () => {
  let guard: AuthGuard;
  let jwtService: { verifyAsync: jest.Mock };
  let configService: { get: jest.Mock };
  let reflector: { getAllAndOverride: jest.Mock };

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

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthGuard,
        { provide: JwtService, useValue: jwtService },
        { provide: ConfigService, useValue: configService },
        { provide: Reflector, useValue: reflector },
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
  });

  it('verifies the token using the configured JWT secret', async () => {
    jwtService.verifyAsync.mockResolvedValue({
      sub: 'user-id',
      firstName: 'Test',
      lastName: 'User',
    });
    const { context } = createContext('Bearer good-token');

    await guard.canActivate(context);

    expect(configService.get).toHaveBeenCalledWith('auth');
    expect(jwtService.verifyAsync).toHaveBeenCalledWith('good-token', {
      secret: 'test-secret',
    });
  });

  it('attaches the decoded payload to the request and allows access', async () => {
    const payload = { sub: 'user-id', name: 'Test User' };
    jwtService.verifyAsync.mockResolvedValue(payload);
    const { context, request } = createContext('Bearer good-token');

    const result = await guard.canActivate(context);

    expect(result).toBe(true);
    expect(request.user).toEqual(payload);
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
  });
});
