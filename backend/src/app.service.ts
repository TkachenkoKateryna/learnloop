import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppConfig, ConfigType } from './config/config.types';

@Injectable()
export class AppService {
  constructor(private readonly configService: ConfigService<ConfigType>) {}

  getHello(): string {
    const prefix = this.configService.get<AppConfig>('app')?.messagePrefix;
    return `${prefix} Hello World!`;
  }
}
