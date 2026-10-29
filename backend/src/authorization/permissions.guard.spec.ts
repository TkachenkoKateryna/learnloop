import {
  ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import { PermissionsGuard } from './permissions.guard';
import { PERMISSIONS_KEY } from './permissions.decorator';
import { IS_AUTHENTICATED_KEY } from './authenticated.decorator';
import { Permission, Permissions } from './permissions';
import { Role } from './role.enum';
import { IS_PUBLIC_KEY } from './public.decorator';

interface MockRequest {
  user?: { sub: string; role: Role };
}

describe('PermissionsGuard', () => {
  let guard: PermissionsGuard;
  let reflector: { getAllAndOverride: jest.Mock };

  const createContext = (
    request: MockRequest = { user: { sub: 'user-id', role: Role.Librarian } },
  ) =>
    ({
      switchToHttp: () => ({
        getRequest: () => request,
      }),
      getHandler: () => undefined,
      getClass: () => undefined,
    }) as unknown as ExecutionContext;

  const setMetadata = ({
    isPublic = false,
    isAuthenticated = false,
    permissions,
  }: {
    isPublic?: boolean;
    isAuthenticated?: boolean;
    permissions?: Permission[];
  }) => {
    reflector.getAllAndOverride.mockImplementation((key: string) => {
      if (key === IS_PUBLIC_KEY) return isPublic;
      if (key === IS_AUTHENTICATED_KEY) return isAuthenticated;
      if (key === PERMISSIONS_KEY) return permissions;
      return undefined;
    });
  };

  beforeEach(async () => {
    reflector = { getAllAndOverride: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PermissionsGuard,
        { provide: Reflector, useValue: reflector },
      ],
    }).compile();

    guard = module.get<PermissionsGuard>(PermissionsGuard);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('throws Forbidden for a route with no metadata', () => {
    setMetadata({});

    expect(() => guard.canActivate(createContext())).toThrow(
      ForbiddenException,
    );
  });

  it('throws Forbidden for a route with an empty @RequirePermissions()', () => {
    setMetadata({ permissions: [] });

    expect(() => guard.canActivate(createContext())).toThrow(
      ForbiddenException,
    );
  });

  it('allows any signed-in user on an @Authenticated route', () => {
    setMetadata({ isAuthenticated: true });
    const context = createContext({
      user: { sub: 'user-id', role: Role.Member },
    });

    expect(guard.canActivate(context)).toBe(true);
  });

  it('throws Unauthorized on an @Authenticated route without a user', () => {
    setMetadata({ isAuthenticated: true });

    expect(() => guard.canActivate(createContext({}))).toThrow(
      UnauthorizedException,
    );
  });

  it('still checks permissions on an @Authenticated route that requires them', () => {
    setMetadata({
      isAuthenticated: true,
      permissions: [Permissions.Books.Delete],
    });

    expect(() => guard.canActivate(createContext())).toThrow(
      ForbiddenException,
    );
  });

  it('allows a route marked @Public even without a user', () => {
    setMetadata({ isPublic: true, permissions: [Permissions.Books.Create] });

    expect(guard.canActivate(createContext({}))).toBe(true);
  });

  it('allows a role that has the permission', () => {
    setMetadata({ permissions: [Permissions.Books.Create] });

    expect(guard.canActivate(createContext())).toBe(true);
  });

  it('throws Forbidden when the role lacks the permission', () => {
    setMetadata({ permissions: [Permissions.Books.Create] });
    const context = createContext({
      user: { sub: 'user-id', role: Role.Member },
    });

    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });

  it('throws Forbidden when only some of the required permissions are granted', () => {
    setMetadata({
      permissions: [Permissions.Books.Update, Permissions.Books.Delete],
    });

    expect(() => guard.canActivate(createContext())).toThrow(
      ForbiddenException,
    );
  });

  it('throws Unauthorized when there is no user on the request', () => {
    setMetadata({ permissions: [Permissions.Books.Read] });

    expect(() => guard.canActivate(createContext({}))).toThrow(
      UnauthorizedException,
    );
  });
});
