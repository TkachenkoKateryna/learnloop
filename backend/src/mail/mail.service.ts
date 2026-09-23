import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createTransport, Transporter } from 'nodemailer';
import sgTransport from 'nodemailer-sendgrid';
import { ConfigType, MailConfig } from '../config/config.types';

@Injectable()
export class MailService {
  private readonly transporter: Transporter;
  private readonly from: string;

  constructor(configService: ConfigService<ConfigType>) {
    const mailConfig = configService.getOrThrow<MailConfig>('mail');

    this.transporter = createTransport(
      sgTransport({ apiKey: mailConfig.sendgridApiKey }),
    );
    this.from = `"${mailConfig.fromName}" <${mailConfig.fromEmail}>`;
  }

  public async sendPasswordResetEmail(
    to: string,
    resetUrl: string,
  ): Promise<void> {
    await this.transporter.sendMail({
      from: this.from,
      to,
      subject: 'Reset your password',
      text: `We received a request to reset your password. This link expires shortly and can only be used once:\n\n${resetUrl}\n\nIf you didn't request this, you can ignore this email.`,
      html: `<p>We received a request to reset your password. This link expires shortly and can only be used once:</p><p><a href="${resetUrl}">${resetUrl}</a></p><p>If you didn't request this, you can ignore this email.</p>`,
    });
  }
}
