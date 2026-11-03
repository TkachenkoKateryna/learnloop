import { DefaultNamingStrategy, Table } from 'typeorm';
import { fitIdentifier, shortHash } from './sql';

export const snakeCase = (value: string): string =>
  value
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1_$2')
    .toLowerCase();

// Must never throw: TypeORM also calls these methods during renames, only to
// check whether an existing, explicitly named constraint uses its default name.
export class SnakeNamingStrategy extends DefaultNamingStrategy {
  tableName(targetName: string, userSpecifiedName: string | undefined): string {
    return userSpecifiedName ?? snakeCase(targetName);
  }

  columnName(
    propertyName: string,
    customName: string | undefined,
    embeddedPrefixes: string[],
  ): string {
    return (
      customName ?? snakeCase([...embeddedPrefixes, propertyName].join('_'))
    );
  }

  joinColumnName(relationName: string, referencedColumnName: string): string {
    return snakeCase(`${relationName}_${referencedColumnName}`);
  }

  joinTableColumnName(
    tableName: string,
    propertyName: string,
    columnName?: string,
  ): string {
    return snakeCase(`${tableName}_${columnName ?? propertyName}`);
  }

  primaryKeyName(tableOrName: Table | string): string {
    return this.constraintName('pk', tableOrName, []);
  }

  foreignKeyName(tableOrName: Table | string, columnNames: string[]): string {
    return this.constraintName('fk', tableOrName, columnNames);
  }

  indexName(
    tableOrName: Table | string,
    columnNames: string[],
    where?: string,
  ): string {
    return this.constraintName(
      'idx',
      tableOrName,
      columnNames,
      where && shortHash(where),
    );
  }

  uniqueConstraintName(
    tableOrName: Table | string,
    columnNames: string[],
  ): string {
    return this.constraintName('uq', tableOrName, columnNames);
  }

  private constraintName(
    prefix: string,
    tableOrName: Table | string,
    columnNames: string[],
    suffix?: string,
  ): string {
    return fitIdentifier(
      [
        prefix,
        this.getTableName(tableOrName),
        ...[...columnNames].sort(),
        ...(suffix ? [suffix] : []),
      ].join('_'),
    );
  }
}
