import {
  Body,
  ClassSerializerInterceptor,
  Controller,
  Get,
  HttpCode,
  NotFoundException,
  Post,
  Req,
  Res,
  SerializeOptions,
  UseInterceptors,
} from '@nestjs/common';
import type { Response } from 'express';
import { hours, minutes, Throttle } from '@nestjs/throttler';

import { AuthService } from './auth.service';
import { UserService } from '../user.service';
import { LoginThrottle } from './login-throttle';

import { Public } from '../decorators/public.decorator';
import { CurrentUser } from '../decorators/current-user.decorator';

import { User } from '../entities/user.entity';
import { CreateUserDto } from '../dto/create-user.dto';
import { LoginDto } from '../dto/login.dto';
import { ForgotPasswordDto } from '../dto/forgot-password.dto';
import { ResetPasswordDto } from '../dto/reset-password.dto';
import { LoginResponse } from '../dto/login.response';
import { ProfileResponse } from '../dto/profile.response';
import { type RequestUser } from '../interfaces/auth.request';
import { type RefreshTokenRequest } from '../interfaces/refresh-token';

@Controller('auth')
@UseInterceptors(ClassSerializerInterceptor)
@SerializeOptions({ strategy: 'excludeAll' })
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly userService: UserService,
  ) {}

  @Post('register')
  @Public()
  @Throttle({ default: { limit: 3, ttl: minutes(1) } })
  async register(@Body() createUserDto: CreateUserDto): Promise<User> {
    return await this.authService.register(createUserDto);
  }

  @Post('login')
  @Public()
  @LoginThrottle()
  async login(
    @Body() loginDto: LoginDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<LoginResponse> {
    const { accessToken, refreshToken, refreshTokenCookieMaxAge } =
      await this.authService.login(loginDto);

    this.setRefreshTokenCookie(
      response,
      refreshToken,
      refreshTokenCookieMaxAge,
    );

    return new LoginResponse(accessToken);
  }

  @Post('forgot-password')
  @Public()
  @HttpCode(200)
  @Throttle({ default: { limit: 3, ttl: hours(1) } })
  async forgotPassword(
    @Body() forgotPasswordDto: ForgotPasswordDto,
  ): Promise<void> {
    await this.authService.forgotPassword(forgotPasswordDto.email);
  }

  @Post('reset-password')
  @Public()
  @HttpCode(200)
  @Throttle({ default: { limit: 5, ttl: minutes(15) } })
  async resetPassword(
    @Body() resetPasswordDto: ResetPasswordDto,
  ): Promise<void> {
    await this.authService.resetPassword(
      resetPasswordDto.token,
      resetPasswordDto.newPassword,
    );
  }

  @Post('refresh')
  @Public()
  async refresh(
    @Req() request: RefreshTokenRequest,
    @Res({ passthrough: true }) response: Response,
  ): Promise<LoginResponse> {
    const { accessToken, refreshToken, refreshTokenCookieMaxAge } =
      await this.authService.refresh(request.cookies.refreshToken);

    this.setRefreshTokenCookie(
      response,
      refreshToken,
      refreshTokenCookieMaxAge,
    );

    return new LoginResponse(accessToken);
  }

  @Post('logout')
  @Public()
  @HttpCode(204)
  async logout(
    @Req() request: RefreshTokenRequest,
    @Res({ passthrough: true }) response: Response,
  ): Promise<void> {
    await this.authService.logout(request.cookies.refreshToken);

    response.clearCookie('refreshToken', { path: '/auth' });
  }

  @Get('/profile')
  async profile(
    @CurrentUser() currentUser: RequestUser,
  ): Promise<ProfileResponse> {
    const user = await this.userService.findOne(currentUser.sub);

    if (user) {
      return new ProfileResponse(user);
    }

    throw new NotFoundException();
  }

  private setRefreshTokenCookie(
    response: Response,
    refreshToken: string,
    maxAge: number | undefined,
  ) {
    response.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/auth',
      maxAge,
    });
  }
}
