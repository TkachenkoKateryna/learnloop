import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from './permissions.decorator';
import { IS_AUTHENTICATED_KEY } from './authenticated.decorator';
import { Permission } from './permissions';
import { hasPermission } from './role-permissions';
import { IS_PUBLIC_KEY } from './public.decorator';
import { Role } from './role.enum';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const targets = [context.getHandler(), context.getClass()];

    if (this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, targets)) {
      return true;
    }

    const { user } = context
      .switchToHttp()
      .getRequest<{ user?: { role: Role } }>();
    if (!user) {
      throw new UnauthorizedException();
    }

    const requiredPermissions = this.reflector.getAllAndOverride<
      Permission[] | undefined
    >(PERMISSIONS_KEY, targets);

    if (!requiredPermissions?.length) {
      if (
        this.reflector.getAllAndOverride<boolean>(IS_AUTHENTICATED_KEY, targets)
      ) {
        return true;
      }
      throw new ForbiddenException();
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
