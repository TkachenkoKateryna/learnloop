# LearnLoop backend

REST API for the LearnLoop library app: user accounts, authentication, role-based permissions and the book catalog. Built with NestJS 11, TypeORM 1.1 and PostgreSQL 16.

## Getting started

You need Node.js 22 (see `.nvmrc` in the repository root) and Docker.

```bash
cd backend
npm install
cp .env.example .env            # then fill in the values, see below
docker compose up -d            # Postgres on localhost:5433
npm run migration:run           # create the schema
npm run start:dev               # API on http://localhost:3000
```

The frontend expects the API on port 3000 and runs on `http://localhost:5173`.

### Your first admin

Everyone who registers gets the `member` role. To make yourself an admin, register through the app or `POST /auth/register`, then run:

```bash
npm run build
npm run user:set-role -- you@example.com admin
```

The roles are `admin`, `librarian` and `member`. Changing a role signs the user out of all their sessions, so their permissions reload on the next login. The script refuses to demote the last admin.

## Environment variables

`.env.example` lists every variable with a working local default. The ones you need to know about:

| Variable                                                                                | Purpose                                                                                                                        |
| --------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`                               | Postgres connection. The defaults match `docker-compose.yml`.                                                                  |
| `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`                                               | Signing secrets. Use two different random values; the command to generate them is in `.env.example`.                           |
| `JWT_ACCESS_EXPIRES_IN`, `JWT_REFRESH_EXPIRES_IN`, `JWT_REFRESH_REMEMBER_ME_EXPIRES_IN` | Token lifetimes in `ms` format (`15m`, `1d`, `30d`).                                                                           |
| `PASSWORD_RESET_URL`                                                                    | Frontend reset-password page. The token is appended as `?token=...`.                                                           |
| `SENDGRID_API_KEY`, `MAIL_FROM_EMAIL`                                                   | Password reset emails. With a placeholder key the request still succeeds, but the email fails to send and the error is logged. |
| `CORS_ORIGINS`                                                                          | Comma-separated frontend origins allowed to call the API with cookies.                                                         |
| `THROTTLE_TTL`, `THROTTLE_LIMIT`                                                        | Global rate limit per IP. Auth routes set tighter limits in code.                                                              |

The app validates these at startup and refuses to start if a required one is missing.

## API

All routes need a signed-in user unless marked public. Send the access token as `Authorization: Bearer <token>`.

| Method and path                | Access                          | What it does                                                                |
| ------------------------------ | ------------------------------- | --------------------------------------------------------------------------- |
| `POST /auth/register`          | Public, 3 per minute per IP     | Create an account with the `member` role.                                   |
| `POST /auth/login`             | Public, rate-limited            | Returns an access token and sets the `refreshToken` cookie.                 |
| `POST /auth/refresh`           | Public (uses the cookie)        | Returns a new access token and rotates the refresh token.                   |
| `POST /auth/logout`            | Public (uses the cookie)        | Revokes the session and clears the cookie.                                  |
| `POST /auth/forgot-password`   | Public, 3 per hour per IP       | Emails a reset link. Responds the same way whether or not the email exists. |
| `POST /auth/reset-password`    | Public, 5 per 15 minutes per IP | Sets a new password and signs the user out everywhere.                      |
| `GET /auth/profile`            | Any signed-in user              | The current user, their role and their permissions.                         |
| `GET /books`, `GET /books/:id` | `books:read`                    | List books, or get one.                                                     |
| `POST /books`                  | `books:create`                  | Create a book. Needs the id of an existing publisher.                       |
| `PATCH /books/:id`             | `books:update`                  | Update a book.                                                              |
| `DELETE /books/:id`            | `books:delete`                  | Delete a book.                                                              |

ISBNs are accepted with or without hyphens, as ISBN-10 or ISBN-13, and stored as 13 digits. Creating or updating a book returns 409 if another book has the same ISBN, and 400 if the publisher doesn't exist.

Login allows 5 attempts per minute per IP and email, and 20 per minute per IP across all emails. A blocked request gets a 429 with a `Retry-After` header.

There's no publisher API yet. To create books locally, insert a publisher first:

```bash
docker exec -it my_postgres psql -U postgres -d learnloop -c "INSERT INTO publishers (name) VALUES ('Penguin') RETURNING id;"
```

### How authentication works

- The **access token** is a short-lived JWT that the frontend keeps in memory.
- The **refresh token** is a JWT in an httpOnly cookie, scoped to `/auth`. Each refresh replaces it. Reusing an old one revokes the whole session.
- Every login creates a row in the `sessions` table. Logout, password reset and role changes revoke sessions, and access tokens stop working as soon as their session is revoked, not when they expire.
- The user's role is read from the database on every request, so a role change takes effect straight away.

### Permissions

Routes check permissions, never role names. A global guard denies any route that has no `@RequirePermissions(...)`, unless it is marked `@Public()` or `@Authenticated()`. The role-to-permission map is in `src/authorization/role-permissions.ts`.

| Role        | Permissions                                  |
| ----------- | -------------------------------------------- |
| `admin`     | Everything                                   |
| `librarian` | `books:read`, `books:create`, `books:update` |
| `member`    | `books:read`                                 |

The full design, including planned resources, is in [docs/roles-and-permissions.md](../docs/roles-and-permissions.md).

## Project structure

```
src/
  auth/            login, tokens, sessions, password reset, AuthGuard; registers the global guards
  users/           User entity and UserService (no HTTP routes yet)
  authorization/   roles, permission keys, decorators and PermissionsGuard
  books/           book catalog: entity, DTOs, controller, service
  publishers/      Publisher entity (no routes yet)
  mail/            SendGrid email sending
  database/        CLI data source, naming strategy, migrations, Postgres error helpers
  config/          environment loading and validation
  cli/             set-user-role script
```

Dependencies point one way: `auth` uses `users`, and every feature can use `authorization`, `config`, `database` and `mail`, but never the reverse. Each module registers its own entities with `TypeOrmModule.forFeature`.

## Database migrations

The schema is defined by the migrations in `src/database/migrations`. The app never changes the schema on its own, so apply migrations before starting it.

Database names are snake_case: tables are plural (`users`, `password_reset_tokens`), columns are snake_case (`first_name`), and constraints read `pk_users`, `fk_sessions_user_id`, `idx_books_publisher_id`, `uq_books_isbn`. `SnakeNamingStrategy` in `src/database/` produces them, so entity properties stay camelCase in TypeScript. Use the snake_case names in raw SQL, `@Check` expressions and `@JoinColumn({ name })`. Name every `@Check` with `checkName('chk_<table>_<rule>', expression)` from `src/database/sql.ts`: TypeORM compares checks by name only, so the hash it appends makes any change to the expression, such as a new enum value, produce a migration. Give unique indexes (`uq_<table>_<column>`) and partial indexes an explicit name on the entity too, because the strategy can't tell them apart from plain indexes. A partial index without a name gets a hash suffix, and so does any generated name longer than Postgres's 63-character limit. When a service maps a constraint violation to an HTTP error, export the constraint name from the entity, as `USER_EMAIL_UNIQUE` and `BOOK_ISBN_UNIQUE` are.

```bash
npm run migration:run       # apply pending migrations
npm run migration:show      # list migrations and whether they are applied
npm run migration:revert    # undo the most recent one
```

After changing an entity, generate a migration from the difference between your entities and your local database, then review it, format it and apply it:

```bash
npm run migration:generate -- src/database/migrations/AddPublisherCountry
npm run format
npm run migration:run
```

Commit the migration together with the entity change. For data changes that aren't schema differences, start from an empty file with `npm run migration:create -- src/database/migrations/<Name>`.

`npm run migration:check` fails if your entities differ from your database, so it catches an entity change without a migration. CI runs it against a fresh database built from the migrations.

**Never edit a migration after it has been merged.** By then it has run on other databases (teammates', CI's, production's), and those would no longer match a database built from the edited file. Fix mistakes with a new migration instead. Editing one is fine while it exists only on your branch.

Each migration runs in its own transaction. For a statement Postgres can't run inside a transaction, such as `CREATE INDEX CONCURRENTLY`, set `transaction = false` on that migration class.

The app refuses to start while a migration is pending, and tells you which one. If the database has a migration your branch doesn't know, for example after switching branches, it starts but logs a warning. Revert that migration on the branch that has it.

### Upgrading from DB_SYNC

Databases created before migrations were added were built by `DB_SYNC`, with different table names. The first migration refuses to run on them. Back up your data, recreate the schema, and apply the migrations:

```bash
docker exec my_postgres pg_dump -U postgres -d learnloop > learnloop-backup.sql
docker exec my_postgres psql -U postgres -d learnloop -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"
npm run migration:run
```

Then register again and make yourself an admin (see [Your first admin](#your-first-admin)). Old accounts and books are only in the backup.

### Production

In production, build first and run the compiled migrations before starting the app:

```bash
npm run build
npm run migration:run:prod
npm run start:prod
```

## Tests

```bash
npm test              # unit tests, no database needed
npm run test:e2e      # end-to-end tests against a real Postgres
npm run test:cov      # unit tests with coverage
```

The e2e tests use a separate `learnloop_e2e` database. They wipe it and rebuild it from the migrations on every run, and they replace the mail service with a mock. Create the database once:

```bash
docker exec my_postgres createdb -U postgres learnloop_e2e
```

## Checks

CI runs these on every pull request. Run them before pushing:

```bash
npm run lint:check
npm run typecheck
npm run build
npm test
```

A second CI job starts Postgres, applies the migrations to an empty database, runs `npm run migration:check` and then the e2e tests.

`npm run lint` and `npm run format` fix what they can.

## More documentation

- [Authentication and authorization](../docs/authentication-and-authorization.md): the sign-in, refresh, reset and role-change flows, and the rules they keep.
- [Roles and permissions](../docs/roles-and-permissions.md): roles, permission keys and the planned resources.
- [Database design](../docs/er-diagram.md): the target library schema with an ER diagram. It describes where the schema is heading; the migrations define what exists today.
