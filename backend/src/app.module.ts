import { Module } from '@nestjs/common';
import { APP_GUARD, Reflector } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule, ConfigService } from '@nestjs/config';
import {
  appConfigSchema,
  ConfigType,
  ThrottleConfig,
} from './config/config.types';
import { typeOrmConfig } from './config/database.config';
import { authConfig } from './config/auth.config';
import { mailConfig } from './config/mail.config';
import { throttleConfig } from './config/throttle.config';
import { corsConfig } from './config/cors.config';
import { TypeOrmModule, TypeOrmModuleOptions } from '@nestjs/typeorm';
import { BooksModule } from './books/books.module';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { PublishersModule } from './publishers/publishers.module';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { loginIpThrottler } from './auth/login-throttle';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [typeOrmConfig, authConfig, mailConfig, throttleConfig, corsConfig],
      validationSchema: appConfigSchema,
      validationOptions: {
        abortEarly: true,
      },
    }),
    ThrottlerModule.forRootAsync({
      inject: [ConfigService, Reflector],
      useFactory: (
        configService: ConfigService<ConfigType>,
        reflector: Reflector,
      ) => {
        const { ttl, limit, skip } =
          configService.getOrThrow<ThrottleConfig>('throttle');

        return {
          throttlers: [
            { name: 'default', ttl, limit },
            loginIpThrottler(reflector, skip),
          ],
          skipIf: () => skip,
        };
      },
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService<ConfigType>) => ({
        ...configService.get<TypeOrmModuleOptions>('database'),
        autoLoadEntities: true,
      }),
    }),
    BooksModule,
    UsersModule,
    AuthModule,
    PublishersModule,
  ],
  controllers: [AppController],
  providers: [AppService, { provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
