import { Module } from '@nestjs/common';
import { User } from './entities/user.entity';
import { Session } from './entities/session.entity';
import { PasswordResetToken } from './entities/password-reset-token.entity';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PasswordService } from './password/password.service';
import { UserService } from './user.service';
import { AuthService } from './auth/auth.service';
import { AuthController } from './auth/auth.controller';
import { AuthGuard } from './auth/auth.guard';
import { APP_GUARD } from '@nestjs/core';
import { SessionService } from './session/session.service';
import { PasswordResetService } from './password-reset/password-reset.service';
import { MailModule } from '../mail/mail.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Session, PasswordResetToken]),
    JwtModule.register({}),
    MailModule,
  ],
  controllers: [AuthController],
  providers: [
    PasswordService,
    UserService,
    AuthService,
    SessionService,
    PasswordResetService,
    AuthGuard,
    { provide: APP_GUARD, useClass: AuthGuard },
  ],
})
export class UsersModule {}
