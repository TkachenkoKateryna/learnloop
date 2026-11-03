import { MigrationInterface, QueryRunner } from 'typeorm';

const SYNCHRONIZE_TABLES = [
  'user',
  'book',
  'session',
  'password_reset_token',
  'publisher',
];

export class InitialSchema1793367033656 implements MigrationInterface {
  name = 'InitialSchema1793367033656';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const leftovers = (await queryRunner.query(
      `SELECT table_name FROM information_schema.tables
       WHERE table_schema = current_schema() AND table_name = ANY($1)`,
      [SYNCHRONIZE_TABLES],
    )) as { table_name: string }[];

    if (leftovers.length > 0) {
      const tables = leftovers.map(({ table_name }) => table_name).join(', ');
      throw new Error(
        `This database was built by DB_SYNC (found: ${tables}). Back it up and recreate the schema first; see "Upgrading from DB_SYNC" in backend/README.md.`,
      );
    }

    await queryRunner.query(`
            CREATE TABLE "users" (
                "id" uuid NOT NULL DEFAULT gen_random_uuid(),
                "first_name" character varying NOT NULL,
                "last_name" character varying NOT NULL,
                "email" character varying NOT NULL,
                "password" character varying NOT NULL,
                "role" character varying(20) NOT NULL DEFAULT 'member',
                "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                CONSTRAINT "chk_users_role_f9d8f145" CHECK ("role" IN ('admin', 'librarian', 'member')),
                CONSTRAINT "chk_users_email_normalized_6c5c4236" CHECK ("email" = lower(btrim("email"))),
                CONSTRAINT "pk_users" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(`
            CREATE UNIQUE INDEX "uq_users_email" ON "users" ("email")
        `);
    await queryRunner.query(`
            CREATE TABLE "password_reset_tokens" (
                "id" uuid NOT NULL DEFAULT gen_random_uuid(),
                "token_hash" character varying NOT NULL,
                "expires_at" TIMESTAMP WITH TIME ZONE NOT NULL,
                "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                "used_at" TIMESTAMP WITH TIME ZONE,
                "user_id" uuid NOT NULL,
                CONSTRAINT "pk_password_reset_tokens" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(`
            CREATE UNIQUE INDEX "uq_password_reset_tokens_token_hash" ON "password_reset_tokens" ("token_hash")
        `);
    await queryRunner.query(`
            CREATE INDEX "idx_password_reset_tokens_user_id" ON "password_reset_tokens" ("user_id")
        `);
    await queryRunner.query(`
            CREATE TABLE "publishers" (
                "id" uuid NOT NULL DEFAULT gen_random_uuid(),
                "name" character varying NOT NULL,
                CONSTRAINT "pk_publishers" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(`
            CREATE TABLE "books" (
                "id" uuid NOT NULL DEFAULT gen_random_uuid(),
                "title" character varying(300) NOT NULL,
                "isbn" character varying NOT NULL,
                "language" character varying(10) NOT NULL DEFAULT 'en',
                "publication_date" date NOT NULL,
                "description" text,
                "publisher_id" uuid NOT NULL,
                CONSTRAINT "chk_books_isbn_normalized_96d95078" CHECK ("isbn" ~ '^[0-9]{13}$'),
                CONSTRAINT "chk_books_language_943c5415" CHECK ("language" IN ('uk', 'en', 'pl', 'de')),
                CONSTRAINT "pk_books" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(`
            CREATE UNIQUE INDEX "uq_books_isbn" ON "books" ("isbn")
        `);
    await queryRunner.query(`
            CREATE INDEX "idx_books_publisher_id" ON "books" ("publisher_id")
        `);
    await queryRunner.query(`
            CREATE TABLE "sessions" (
                "id" uuid NOT NULL DEFAULT gen_random_uuid(),
                "refresh_token_hash" character varying NOT NULL,
                "expires_at" TIMESTAMP WITH TIME ZONE NOT NULL,
                "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                "revoked_at" TIMESTAMP WITH TIME ZONE,
                "remember_me" boolean NOT NULL DEFAULT false,
                "user_id" uuid NOT NULL,
                CONSTRAINT "pk_sessions" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(`
            CREATE UNIQUE INDEX "uq_sessions_refresh_token_hash" ON "sessions" ("refresh_token_hash")
        `);
    await queryRunner.query(`
            CREATE INDEX "idx_sessions_user_id" ON "sessions" ("user_id")
        `);
    await queryRunner.query(`
            ALTER TABLE "password_reset_tokens"
            ADD CONSTRAINT "fk_password_reset_tokens_user_id" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
    await queryRunner.query(`
            ALTER TABLE "books"
            ADD CONSTRAINT "fk_books_publisher_id" FOREIGN KEY ("publisher_id") REFERENCES "publishers"("id") ON DELETE RESTRICT ON UPDATE NO ACTION
        `);
    await queryRunner.query(`
            ALTER TABLE "sessions"
            ADD CONSTRAINT "fk_sessions_user_id" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE "sessions" DROP CONSTRAINT "fk_sessions_user_id"
        `);
    await queryRunner.query(`
            ALTER TABLE "books" DROP CONSTRAINT "fk_books_publisher_id"
        `);
    await queryRunner.query(`
            ALTER TABLE "password_reset_tokens" DROP CONSTRAINT "fk_password_reset_tokens_user_id"
        `);
    await queryRunner.query(`
            DROP INDEX "idx_sessions_user_id"
        `);
    await queryRunner.query(`
            DROP INDEX "uq_sessions_refresh_token_hash"
        `);
    await queryRunner.query(`
            DROP TABLE "sessions"
        `);
    await queryRunner.query(`
            DROP INDEX "idx_books_publisher_id"
        `);
    await queryRunner.query(`
            DROP INDEX "uq_books_isbn"
        `);
    await queryRunner.query(`
            DROP TABLE "books"
        `);
    await queryRunner.query(`
            DROP TABLE "publishers"
        `);
    await queryRunner.query(`
            DROP INDEX "idx_password_reset_tokens_user_id"
        `);
    await queryRunner.query(`
            DROP INDEX "uq_password_reset_tokens_token_hash"
        `);
    await queryRunner.query(`
            DROP TABLE "password_reset_tokens"
        `);
    await queryRunner.query(`
            DROP INDEX "uq_users_email"
        `);
    await queryRunner.query(`
            DROP TABLE "users"
        `);
  }
}
