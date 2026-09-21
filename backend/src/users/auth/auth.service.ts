import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { createHash, randomUUID, timingSafeEqual } from 'crypto';
import ms, { StringValue } from 'ms';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UserService } from '../user.service';
import { CreateUserDto } from '../dto/create-user.dto';
import { User } from '../entities/user.entity';
import { PasswordService } from '../password/password.service';
import { AuthConfig, ConfigType } from '../../config/config.types';
import { SessionService } from '../session/session.service';
import { LoginDto } from '../dto/login.dto';
import { RefreshTokenLifetime } from '../interfaces/refresh-token';
import { JWTPayload } from '../interfaces/jwt-payload';

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  refreshTokenCookieMaxAge?: number;
}

@Injectable()
export class AuthService {
  private readonly jwtConfig: AuthConfig['jwt'];

  constructor(
    private readonly userService: UserService,
    private readonly jwtService: JwtService,
    private readonly sessionService: SessionService,
    private readonly passwordService: PasswordService,
    configService: ConfigService<ConfigType>,
  ) {
    this.jwtConfig = configService.getOrThrow<AuthConfig>('auth').jwt;
  }

  public async register(createUserDto: CreateUserDto): Promise<User> {
    const existingUser = await this.userService.findOneByEmail(
      createUserDto.email,
    );

    if (existingUser) {
      throw new ConflictException('Email already exists');
    }

    const user = await this.userService.createUser(createUserDto);

    return user;
  }

  public async login({
    email,
    password,
    rememberMe,
  }: LoginDto): Promise<AuthTokens> {
    const user = await this.userService.findOneByEmail(email);

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!(await this.passwordService.verify(password, user.password))) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const sessionId = randomUUID();
    const {
      expiresIn: refreshTokenExpiresIn,
      expiresAt: refreshTokenExpiresAt,
      cookieMaxAge,
    } = this.getRefreshTokenLifetime(rememberMe);
    const tokens = await this.signTokens(
      user,
      sessionId,
      refreshTokenExpiresIn,
    );

    await this.sessionService.create({
      id: sessionId,
      userId: user.id,
      refreshTokenHash: this.hashRefreshToken(tokens.refreshToken),
      rememberMe,
      expiresAt: refreshTokenExpiresAt,
    });

    return { ...tokens, refreshTokenCookieMaxAge: cookieMaxAge };
  }

  public async refresh(refreshToken: string | undefined): Promise<AuthTokens> {
    if (!refreshToken) {
      throw new UnauthorizedException('Invalid credentials');
    }

    let payload: JWTPayload;
    try {
      payload = await this.jwtService.verifyAsync<JWTPayload>(refreshToken, {
        secret: this.jwtConfig?.refreshTokenSecret,
      });
    } catch {
      throw new UnauthorizedException('Invalid credentials');
    }

    const session = await this.sessionService.get(payload.sid);

    if (!session || session.revokedAt || session.expiresAt < new Date()) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!this.isCurrentRefreshToken(refreshToken, session.refreshTokenHash)) {
      await this.sessionService.revoke(session.id);
      throw new UnauthorizedException('Invalid credentials');
    }

    const user = await this.userService.findOne(payload.sub);

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const {
      expiresIn: refreshTokenExpiresIn,
      expiresAt: refreshTokenExpiresAt,
      cookieMaxAge,
    } = this.getRefreshTokenLifetime(session.rememberMe);

    const tokens = await this.signTokens(
      user,
      session.id,
      refreshTokenExpiresIn,
    );

    await this.sessionService.rotateRefreshToken(session.id, {
      refreshTokenHash: this.hashRefreshToken(tokens.refreshToken),
      expiresAt: refreshTokenExpiresAt,
    });

    return { ...tokens, refreshTokenCookieMaxAge: cookieMaxAge };
  }

  public async logout(refreshToken: string | undefined): Promise<void> {
    if (!refreshToken) {
      return;
    }

    try {
      const payload = await this.jwtService.verifyAsync<JWTPayload>(
        refreshToken,
        { secret: this.jwtConfig?.refreshTokenSecret },
      );

      await this.sessionService.revoke(payload.sid);
    } catch {
      // Token is missing, malformed, expired, or already revoked — in every
      // case the end state we want is "not logged in", so there's nothing
      // further to do.
    }
  }

  private async signTokens(
    user: User,
    sessionId: string,
    refreshTokenExpiresIn: StringValue,
  ): Promise<Pick<AuthTokens, 'accessToken' | 'refreshToken'>> {
    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(
        { sub: user.id, firstName: user.firstName, lastName: user.lastName },
        {
          secret: this.jwtConfig?.accessTokenSecret,
          expiresIn: this.jwtConfig?.accessTokenExpiresIn,
        },
      ),
      this.jwtService.signAsync(
        { sub: user.id, sid: sessionId, jti: randomUUID() },
        {
          secret: this.jwtConfig?.refreshTokenSecret,
          expiresIn: refreshTokenExpiresIn,
        },
      ),
    ]);

    return { accessToken, refreshToken };
  }

  // SHA-256 rather than bcrypt: bcrypt only reads the first 72 bytes, and a
  // JWT's first 72 bytes are mostly the fixed header, so every refresh token
  // of a user would compare equal and reuse detection could never trigger.
  private hashRefreshToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private isCurrentRefreshToken(token: string, storedHash: string): boolean {
    const actual = Buffer.from(this.hashRefreshToken(token));
    const expected = Buffer.from(storedHash);

    return (
      actual.length === expected.length && timingSafeEqual(actual, expected)
    );
  }

  private getRefreshTokenLifetime(rememberMe: boolean): RefreshTokenLifetime {
    const expiresIn = rememberMe
      ? this.jwtConfig.refreshTokenRememberMeExpiresIn
      : this.jwtConfig.refreshTokenExpiresIn;

    return {
      expiresIn,
      expiresAt: new Date(Date.now() + ms(expiresIn)),
      cookieMaxAge: rememberMe ? ms(expiresIn) : undefined,
    };
  }
}
