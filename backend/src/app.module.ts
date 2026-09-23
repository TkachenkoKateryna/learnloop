import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { appConfigSchema, ConfigType } from './config/config.types';
import { typeOrmConfig } from './config/database.config';
import { authConfig } from './config/auth.config';
import { mailConfig } from './config/mail.config';
import { TypeOrmModule, TypeOrmModuleOptions } from '@nestjs/typeorm';
import { BooksModule } from './books/books.module';
import { Book } from './books/entities/book.entity';
import { UsersModule } from './users/users.module';
import { PublishersModule } from './publishers/publishers.module';
import { User } from './users/entities/user.entity';
import { Session } from './users/entities/session.entity';
import { PasswordResetToken } from './users/entities/password-reset-token.entity';
import { Publisher } from './publishers/entities/publisher.entity';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [typeOrmConfig, authConfig, mailConfig],
      validationSchema: appConfigSchema,
      validationOptions: {
        abortEarly: true,
      },
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService<ConfigType>) => ({
        ...configService.get<TypeOrmModuleOptions>('database'),
        entities: [Book, User, Publisher, Session, PasswordResetToken],
      }),
    }),
    BooksModule,
    UsersModule,
    PublishersModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
