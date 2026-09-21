import { Module } from '@nestjs/common';
import { User } from './entities/user.entity';
import { Session } from './entities/session.entity';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PasswordService } from './password/password.service';
import { UserService } from './user.service';
import { AuthService } from './auth/auth.service';
import { AuthController } from './auth/auth.controller';
import { AuthGuard } from './auth/auth.guard';
import { APP_GUARD } from '@nestjs/core';
import { SessionService } from './session/session.service';

@Module({
  imports: [TypeOrmModule.forFeature([User, Session]), JwtModule.register({})],
  controllers: [AuthController],
  providers: [
    PasswordService,
    UserService,
    AuthService,
    SessionService,
    AuthGuard,
    { provide: APP_GUARD, useClass: AuthGuard },
  ],
})
export class UsersModule {}
