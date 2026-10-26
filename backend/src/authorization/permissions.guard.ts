import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from './permissions.decorator';
import { Permission } from './permissions';
import { hasPermission } from './role-permissions';
import { IS_PUBLIC_KEY } from '../users/decorators/public.decorator';
import { AuthRequest } from '../users/interfaces/auth.request';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    const requiredPermissions = this.reflector.getAllAndOverride<
      Permission[] | undefined
    >(PERMISSIONS_KEY, [context.getHandler(), context.getClass()]);

    if (isPublic || !requiredPermissions?.length) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest<Partial<AuthRequest>>();
    if (!user) {
      throw new UnauthorizedException();
    }

    const allowed = requiredPermissions.every((permission) =>
      hasPermission(user.role, permission),
    );
    if (!allowed) {
      throw new ForbiddenException();
    }

    return true;
  }
}
