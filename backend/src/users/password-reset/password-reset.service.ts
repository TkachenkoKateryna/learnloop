import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { createHash, randomBytes } from 'crypto';
import ms, { StringValue } from 'ms';
import { ConfigService } from '@nestjs/config';
import { PasswordResetToken } from '../entities/password-reset-token.entity';
import { AuthConfig, ConfigType } from '../../config/config.types';

@Injectable()
export class PasswordResetService {
  private readonly tokenExpiresIn: StringValue;

  constructor(
    @InjectRepository(PasswordResetToken)
    private readonly passwordResetTokenRepository: Repository<PasswordResetToken>,
    configService: ConfigService<ConfigType>,
  ) {
    this.tokenExpiresIn =
      configService.getOrThrow<AuthConfig>('auth').passwordReset.tokenExpiresIn;
  }

  public async createToken(userId: string): Promise<string> {
    const token = randomBytes(32).toString('hex');

    const passwordResetToken = this.passwordResetTokenRepository.create({
      userId,
      tokenHash: this.hashToken(token),
      expiresAt: new Date(Date.now() + ms(this.tokenExpiresIn)),
    });

    await this.passwordResetTokenRepository.save(passwordResetToken);

    return token;
  }

  // Single-use: returns the token's owner and marks it used, or null if the
  // token is unknown, already used, or expired.
  public async consumeToken(token: string): Promise<string | null> {
    const resetToken = await this.passwordResetTokenRepository.findOneBy({
      tokenHash: this.hashToken(token),
    });

    if (!resetToken || resetToken.usedAt || resetToken.expiresAt < new Date()) {
      return null;
    }

    await this.passwordResetTokenRepository.update(resetToken.id, {
      usedAt: new Date(),
    });

    return resetToken.userId;
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }
}
