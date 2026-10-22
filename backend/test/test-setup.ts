import { INestApplication, ValidationPipe } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import { DataSource } from 'typeorm';
import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { testConfig } from './config/test.config';
import { MailService } from '../src/mail/mail.service';

export class TestSetup {
  app: INestApplication;

  dataSource: DataSource;

  // Records outgoing emails instead of sending them, so tests can read the
  // password reset link.
  mailService = {
    sendPasswordResetEmail: jest
      .fn<Promise<void>, [string, string]>()
      .mockResolvedValue(undefined),
  };

  static async create(
    module: any,
    configOverrides: Partial<typeof testConfig> = {},
  ) {
    const instance = new TestSetup();

    await instance.init(module, configOverrides);

    return instance;
  }

  async init(module: any, configOverrides: Partial<typeof testConfig> = {}) {
    const config = { ...testConfig, ...configOverrides };
    const lookup = (key: string) => {
      if (key.includes('database')) return config.database;
      if (key.includes('auth')) return config.auth;
      if (key.includes('mail')) return config.mail;
      if (key.includes('throttle')) return config.throttle;
      return null;
    };

    const moduleFixture = await Test.createTestingModule({
      imports: [module],
    })
      .overrideProvider(ConfigService)
      .useValue({ get: lookup, getOrThrow: lookup })
      .overrideProvider(MailService)
      .useValue(this.mailService)
      .compile();

    this.app = moduleFixture.createNestApplication();
    this.app.use(cookieParser());
    this.app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true }),
    );

    this.dataSource = this.app.get(DataSource);

    await this.app.init();
  }

  async cleanup() {
    const entities = this.dataSource.entityMetadatas;

    const tableNames = entities
      .map((entity) => `"${entity.tableName}"`)
      .join(', ');

    await this.dataSource.query(
      `TRUNCATE ${tableNames} RESTART IDENTITY CASCADE;`,
    );
    this.mailService.sendPasswordResetEmail.mockClear();
  }

  async teardown() {
    await this.dataSource.destroy();
    await this.app.close();
  }
}
