import {
  Body,
  ClassSerializerInterceptor,
  Controller,
  Get,
  HttpCode,
  NotFoundException,
  Post,
  Req,
  Request,
  Res,
  SerializeOptions,
  UseInterceptors,
} from '@nestjs/common';
import type { Response } from 'express';

import { AuthService } from './auth.service';
import { UserService } from '../user.service';

import { Public } from '../decorators/public.decorator';

import { User } from '../entities/user.entity';
import { CreateUserDto } from '../dto/create-user.dto';
import { LoginDto } from '../dto/login.dto';
import { LoginResponse } from '../dto/login.response';
import { type AuthRequest } from '../interfaces/auth.request';
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
  async register(@Body() createUserDto: CreateUserDto): Promise<User> {
    return await this.authService.register(createUserDto);
  }

  @Post('login')
  @Public()
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
  async profile(@Request() request: AuthRequest): Promise<User> {
    const user = await this.userService.findOne(request.user.sub);

    if (user) {
      return user;
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
