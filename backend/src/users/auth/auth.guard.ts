import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { AuthConfig, ConfigType } from '../../config/config.types';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { AccessTokenPayload } from '../interfaces/jwt-payload';
import { SessionService } from '../session/session.service';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService<ConfigType>,
    private readonly reflector: Reflector,
    private readonly sessionService: SessionService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();
    const token = this.extractTokenFromHeader(request);
    if (!token) {
      throw new UnauthorizedException();
    }

    let payload: AccessTokenPayload;
    try {
      payload = await this.jwtService.verifyAsync<AccessTokenPayload>(token, {
        secret:
          this.configService.get<AuthConfig>('auth')?.jwt.accessTokenSecret,
      });
    } catch {
      throw new UnauthorizedException();
    }
    if (!(await this.isSessionActive(payload.sid))) {
      throw new UnauthorizedException();
    }

    request['user'] = payload;
    return true;
  }

  // A valid signature isn't enough: logout and password reset revoke the
  // session, and its access tokens must stop working right away.
  private async isSessionActive(
    sessionId: string | undefined,
  ): Promise<boolean> {
    // Tokens signed before access tokens carried a session id.
    if (!sessionId) {
      return false;
    }

    const session = await this.sessionService.get(sessionId);

    return (
      session !== null && !session.revokedAt && session.expiresAt > new Date()
    );
  }

  private extractTokenFromHeader(request: Request): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}
