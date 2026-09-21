import { INestApplication, ValidationPipe } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import { DataSource } from 'typeorm';
import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { testConfig } from './config/test.config';

export class TestSetup {
  app: INestApplication;

  dataSource: DataSource;

  static async create(module: any) {
    const instance = new TestSetup();

    await instance.init(module);

    return instance;
  }

  async init(module: any) {
    const lookup = (key: string) => {
      if (key.includes('database')) return testConfig.database;
      if (key.includes('auth')) return testConfig.auth;
      return null;
    };

    const moduleFixture = await Test.createTestingModule({
      imports: [module],
    })
      .overrideProvider(ConfigService)
      .useValue({ get: lookup, getOrThrow: lookup })
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
  }

  async teardown() {
    await this.dataSource.destroy();
    await this.app.close();
  }
}
