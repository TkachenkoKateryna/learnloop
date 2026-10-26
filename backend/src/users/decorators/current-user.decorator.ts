import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { AuthRequest, RequestUser } from '../interfaces/auth.request';

export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): RequestUser =>
    context.switchToHttp().getRequest<AuthRequest>().user,
);
