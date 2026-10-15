import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, MoreThan, Repository } from 'typeorm';
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
    const tokenHash = this.hashToken(token);
    const resetToken = await this.passwordResetTokenRepository.findOneBy({
      tokenHash,
    });

    if (!resetToken) {
      return null;
    }

    // The unused/unexpired check happens inside the UPDATE, so when two
    // requests race with the same token only one of them changes the row.
    const now = new Date();
    const { affected } = await this.passwordResetTokenRepository.update(
      { tokenHash, usedAt: IsNull(), expiresAt: MoreThan(now) },
      { usedAt: now },
    );

    return affected === 1 ? resetToken.userId : null;
  }

  // Marks every still-unused token of the user as used, so older reset links
  // (e.g. from "Resend email") stop working once the password is changed.
  public async revokeAllForUser(userId: string): Promise<void> {
    await this.passwordResetTokenRepository.update(
      { userId, usedAt: IsNull() },
      { usedAt: new Date() },
    );
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }
}
