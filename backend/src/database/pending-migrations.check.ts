import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { DataSource, MigrationExecutor } from 'typeorm';

@Injectable()
export class PendingMigrationsCheck implements OnApplicationBootstrap {
  private readonly logger = new Logger(PendingMigrationsCheck.name);

  constructor(private readonly dataSource: DataSource) {}

  public async onApplicationBootstrap(): Promise<void> {
    if (this.dataSource.migrations.length === 0) {
      throw new Error(
        'No migrations found; check the migrations path in migrationOptions.',
      );
    }

    const known = this.dataSource.migrations.map(
      (migration) => migration.name ?? migration.constructor.name,
    );
    const executed = (
      await new MigrationExecutor(this.dataSource).getExecutedMigrations()
    ).map(({ name }) => name);

    const pending = known.filter((name) => !executed.includes(name));
    if (pending.length > 0) {
      throw new Error(
        `Pending migrations: ${pending.join(', ')}. Run npm run migration:run first.`,
      );
    }

    const unknown = executed.filter((name) => !known.includes(name));

    if (unknown.length > 0) {
      this.logger.warn(
        `The database has migrations this code doesn't know: ${unknown.join(', ')}. Did you switch branches? Revert them on the branch that has them.`,
      );
    }
  }
}
