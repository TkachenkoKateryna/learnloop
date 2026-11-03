import { Logger } from '@nestjs/common';
import {
  DataSource,
  Migration,
  MigrationExecutor,
  MigrationInterface,
} from 'typeorm';
import { PendingMigrationsCheck } from './pending-migrations.check';

const migration = (name: string) => ({ name }) as Migration;

describe('PendingMigrationsCheck', () => {
  let getExecutedMigrations: jest.SpyInstance<Promise<Migration[]>>;
  let warn: jest.SpyInstance;

  const checkWith = (migrations: string[]) =>
    new PendingMigrationsCheck({
      driver: { options: {}, buildTableName: jest.fn() },
      options: {},
      migrations: migrations.map((name) => ({ name }) as MigrationInterface),
    } as unknown as DataSource);

  beforeEach(() => {
    getExecutedMigrations = jest
      .spyOn(MigrationExecutor.prototype, 'getExecutedMigrations')
      .mockResolvedValue([migration('InitialSchema1')]);
    warn = jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => {});
  });

  afterEach(() => jest.restoreAllMocks());

  it('lets the app start when every migration is applied', async () => {
    await expect(
      checkWith(['InitialSchema1']).onApplicationBootstrap(),
    ).resolves.toBeUndefined();
    expect(warn).not.toHaveBeenCalled();
  });

  it('refuses to start and names the pending migrations', async () => {
    getExecutedMigrations.mockResolvedValue([]);

    await expect(
      checkWith([
        'InitialSchema1',
        'AddPublisherCountry2',
      ]).onApplicationBootstrap(),
    ).rejects.toThrow(
      'Pending migrations: InitialSchema1, AddPublisherCountry2. Run npm run migration:run first.',
    );
  });

  it('refuses to start when no migration files are found', async () => {
    await expect(checkWith([]).onApplicationBootstrap()).rejects.toThrow(
      'No migrations found',
    );
  });

  it('warns, but starts, when the database has migrations the code lacks', async () => {
    getExecutedMigrations.mockResolvedValue([
      migration('InitialSchema1'),
      migration('FromAnotherBranch2'),
    ]);

    await expect(
      checkWith(['InitialSchema1']).onApplicationBootstrap(),
    ).resolves.toBeUndefined();
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('FromAnotherBranch2'),
    );
  });
});
