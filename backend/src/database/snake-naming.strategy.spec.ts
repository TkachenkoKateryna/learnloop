import { Table } from 'typeorm';
import { snakeCase, SnakeNamingStrategy } from './snake-naming.strategy';

describe('snakeCase', () => {
  it.each([
    ['firstName', 'first_name'],
    ['refreshTokenHash', 'refresh_token_hash'],
    ['PasswordResetToken', 'password_reset_token'],
    ['userId', 'user_id'],
    ['ISBNCode', 'isbn_code'],
    ['email', 'email'],
  ])('turns %s into %s', (input, expected) => {
    expect(snakeCase(input)).toBe(expected);
  });
});

describe('SnakeNamingStrategy', () => {
  const strategy = new SnakeNamingStrategy();

  it('snake_cases columns and keeps explicit names', () => {
    expect(strategy.columnName('createdAt', undefined, [])).toBe('created_at');
    expect(strategy.columnName('createdAt', 'custom', [])).toBe('custom');
  });

  it('uses the entity table name, or snake_cases the class name', () => {
    expect(strategy.tableName('PasswordResetToken', 'tokens')).toBe('tokens');
    expect(strategy.tableName('PasswordResetToken', undefined)).toBe(
      'password_reset_token',
    );
  });

  it('names join columns after the relation and referenced column', () => {
    expect(strategy.joinColumnName('user', 'id')).toBe('user_id');
  });

  it('snake_cases many-to-many join table columns', () => {
    expect(strategy.joinTableColumnName('books', 'id', 'id')).toBe('books_id');
    expect(strategy.joinTableInverseColumnName('authors', 'authorId')).toBe(
      'authors_author_id',
    );
  });

  it('builds readable constraint names without the schema', () => {
    expect(strategy.primaryKeyName('public.users')).toBe('pk_users');
    expect(strategy.foreignKeyName('sessions', ['user_id'])).toBe(
      'fk_sessions_user_id',
    );
    expect(
      strategy.indexName(new Table({ name: 'books' }), ['publisher_id']),
    ).toBe('idx_books_publisher_id');
    expect(strategy.uniqueConstraintName('books', ['isbn'])).toBe(
      'uq_books_isbn',
    );
  });

  it('names columns in a stable order, whatever order they arrive in', () => {
    expect(strategy.indexName('books', ['title', 'author_id'])).toBe(
      'idx_books_author_id_title',
    );
    expect(strategy.indexName('books', ['author_id', 'title'])).toBe(
      'idx_books_author_id_title',
    );
  });

  it('gives a partial index a different name from a plain one on the same columns', () => {
    const plain = strategy.indexName('sessions', ['user_id']);
    const partial = strategy.indexName(
      'sessions',
      ['user_id'],
      'revoked_at IS NULL',
    );

    expect(partial).toMatch(/^idx_sessions_user_id_[0-9a-f]{8}$/);
    expect(partial).not.toBe(plain);
    expect(
      strategy.indexName('sessions', ['user_id'], 'revoked_at IS NULL'),
    ).toBe(partial);
  });

  it('shortens names Postgres would truncate, keeping them unique and stable', () => {
    const longName = () =>
      strategy.indexName('a_table_with_a_rather_long_name', [
        'and_an_equally_long_column_name',
      ]);
    const otherLongName = strategy.indexName(
      'a_table_with_a_rather_long_name',
      ['and_an_equally_long_column_name_2'],
    );

    expect(longName()).toHaveLength(63);
    expect(longName()).toMatch(/^idx_a_table_with_a_rather_long_name_and_/);
    expect(longName()).toBe(longName());
    expect(otherLongName).not.toBe(longName());
  });
});
