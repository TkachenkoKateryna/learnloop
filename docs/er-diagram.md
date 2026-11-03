# Library database: ER diagram

**Database:** PostgreSQL, 9 tables
**Diagram:** [er-diagram.svg](er-diagram.svg)

![Entity relationship diagram of the library schema](er-diagram.svg)

## Conventions

- Tables use plural snake_case names (`users`, `book_copies`), so none of them clash with SQL reserved words.
- Every entity table has a `UUID` surrogate key named `id`, with `DEFAULT gen_random_uuid()`. Every foreign key to it is a `UUID` too. Junction tables use a composite primary key made of their two foreign keys.
- The API may supply the id itself when it needs it before the insert. Sign-in does this for `sessions.id`, because it signs the session id into the tokens first.
- All points in time are `TIMESTAMPTZ`.
- Columns without **NN** are optional.

| Marker | Meaning     |
| ------ | ----------- |
| PK     | Primary key |
| FK     | Foreign key |
| NN     | Not null    |
| UQ     | Unique      |

Tables are grouped by area: **catalog** (publishers, books, authors, book_authors), **circulation** (book_copies, borrowings) and **access** (users, sessions, password_reset_tokens).

## Relationships

| Parent        | Child                   | Through FK                      | Cardinality |
| ------------- | ----------------------- | ------------------------------- | ----------- |
| `publishers`  | `books`                 | `books.publisher_id`            | 1 to 0..N   |
| `books`       | `book_copies`           | `book_copies.book_id`           | 1 to 0..N   |
| `books`       | `book_authors`          | `book_authors.book_id`          | 1 to 0..N   |
| `authors`     | `book_authors`          | `book_authors.author_id`        | 1 to 0..N   |
| `book_copies` | `borrowings`            | `borrowings.book_copy_id`       | 1 to 0..N   |
| `users`       | `borrowings`            | `borrowings.user_id`            | 1 to 0..N   |
| `users`       | `sessions`              | `sessions.user_id`              | 1 to 0..N   |
| `users`       | `password_reset_tokens` | `password_reset_tokens.user_id` | 1 to 0..N   |

`books` and `authors` are many-to-many through `book_authors`. A user has one session per signed-in device or browser, and one reset token per "forgot password" request.

## Tables

### publishers

| Column       | Type           | Keys   |
| ------------ | -------------- | ------ |
| `id`         | `UUID`         | PK     |
| `name`       | `VARCHAR(255)` | NN, UQ |
| `created_at` | `TIMESTAMPTZ`  | NN     |
| `updated_at` | `TIMESTAMPTZ`  | NN     |

- `UNIQUE (name)`

### books

| Column             | Type           | Keys   |
| ------------------ | -------------- | ------ |
| `id`               | `UUID`         | PK     |
| `publisher_id`     | `UUID`         | FK, NN |
| `title`            | `VARCHAR(500)` | NN     |
| `description`      | `TEXT`         |        |
| `isbn`             | `VARCHAR(20)`  | UQ     |
| `language`         | `VARCHAR(50)`  | NN     |
| `publication_year` | `SMALLINT`     |        |
| `created_at`       | `TIMESTAMPTZ`  | NN     |
| `updated_at`       | `TIMESTAMPTZ`  | NN     |

- `FOREIGN KEY (publisher_id) REFERENCES publishers(id) ON DELETE RESTRICT`
- `UNIQUE (isbn)`: a book may have no ISBN, but two books can't share one.
- `CHECK (publication_year > 0)`

### authors

| Column       | Type           | Keys |
| ------------ | -------------- | ---- |
| `id`         | `UUID`         | PK   |
| `name`       | `VARCHAR(255)` | NN   |
| `created_at` | `TIMESTAMPTZ`  | NN   |
| `updated_at` | `TIMESTAMPTZ`  | NN   |

`name` is not unique, because different authors can share a name.

### book_authors

| Column         | Type       | Keys   |
| -------------- | ---------- | ------ |
| `book_id`      | `UUID`     | PK, FK |
| `author_id`    | `UUID`     | PK, FK |
| `author_order` | `SMALLINT` | NN     |

- `PRIMARY KEY (book_id, author_id)`
- `UNIQUE (book_id, author_order)`
- `CHECK (author_order >= 1)`
- `FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE`
- `FOREIGN KEY (author_id) REFERENCES authors(id) ON DELETE RESTRICT`

### book_copies

| Column              | Type            | Keys   |
| ------------------- | --------------- | ------ |
| `id`                | `UUID`          | PK     |
| `book_id`           | `UUID`          | FK, NN |
| `barcode`           | `VARCHAR(50)`   | NN, UQ |
| `acquired_at`       | `TIMESTAMPTZ`   | NN     |
| `purchase_price`    | `NUMERIC(10,2)` |        |
| `withdrawn_at`      | `TIMESTAMPTZ`   |        |
| `withdrawal_reason` | `TEXT`          |        |
| `created_at`        | `TIMESTAMPTZ`   | NN     |
| `updated_at`        | `TIMESTAMPTZ`   | NN     |

- `FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE RESTRICT`
- `UNIQUE (barcode)`
- `CHECK (purchase_price >= 0)`
- `CHECK ((withdrawn_at IS NULL) = (withdrawal_reason IS NULL))`: a copy is either withdrawn with a reason, or has neither.

### borrowings

| Column         | Type          | Keys   |
| -------------- | ------------- | ------ |
| `id`           | `UUID`        | PK     |
| `user_id`      | `UUID`        | FK, NN |
| `book_copy_id` | `UUID`        | FK, NN |
| `borrowed_at`  | `TIMESTAMPTZ` | NN     |
| `due_at`       | `TIMESTAMPTZ` | NN     |
| `returned_at`  | `TIMESTAMPTZ` |        |

- `FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT`
- `FOREIGN KEY (book_copy_id) REFERENCES book_copies(id) ON DELETE RESTRICT`
- `CHECK (due_at >= borrowed_at)`
- `CHECK (returned_at IS NULL OR returned_at >= borrowed_at)`
- `UNIQUE INDEX (book_copy_id) WHERE returned_at IS NULL`: a copy has at most one active borrowing.

### users

| Column          | Type           | Keys   |
| --------------- | -------------- | ------ |
| `id`            | `UUID`         | PK     |
| `first_name`    | `VARCHAR(100)` | NN     |
| `last_name`     | `VARCHAR(100)` | NN     |
| `email`         | `VARCHAR(255)` | NN, UQ |
| `password_hash` | `VARCHAR(255)` | NN     |
| `role`          | `VARCHAR(20)`  | NN     |
| `date_of_birth` | `DATE`         |        |
| `anonymized_at` | `TIMESTAMPTZ`  |        |
| `created_at`    | `TIMESTAMPTZ`  | NN     |
| `updated_at`    | `TIMESTAMPTZ`  | NN     |

- `UNIQUE INDEX (lower(email))`: uniqueness ignores case.
- `anonymized_at` is set instead of deleting a user who has borrowing history.
- `CHECK (role IN ('admin', 'librarian', 'member'))`, `DEFAULT 'member'`: every user has exactly one role, and sign-up creates members.
- Roles are fixed. What each role may do is defined in code, not in the database; see [Roles & Permissions](roles-and-permissions.md).

### sessions

One row per sign-in. The row backs the refresh token cookie, and every access token carries its `id` as the `sid` claim.

| Column               | Type          | Keys   |
| -------------------- | ------------- | ------ |
| `id`                 | `UUID`        | PK     |
| `user_id`            | `UUID`        | FK, NN |
| `refresh_token_hash` | `CHAR(64)`    | NN, UQ |
| `remember_me`        | `BOOLEAN`     | NN     |
| `expires_at`         | `TIMESTAMPTZ` | NN     |
| `revoked_at`         | `TIMESTAMPTZ` |        |
| `created_at`         | `TIMESTAMPTZ` | NN     |

- `FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE`
- `UNIQUE (refresh_token_hash)`
- `CHECK (expires_at > created_at)`
- `refresh_token_hash` is the SHA-256 hex digest of the current refresh token. The token itself is never stored.
- `remember_me` (`DEFAULT false`) picks the refresh token lifetime, and every rotation keeps it.
- A session is active while `revoked_at IS NULL AND expires_at > now()`. Revoked rows are kept, not deleted.

### password_reset_tokens

One row per "forgot password" request.

| Column       | Type          | Keys   |
| ------------ | ------------- | ------ |
| `id`         | `UUID`        | PK     |
| `user_id`    | `UUID`        | FK, NN |
| `token_hash` | `CHAR(64)`    | NN, UQ |
| `expires_at` | `TIMESTAMPTZ` | NN     |
| `used_at`    | `TIMESTAMPTZ` |        |
| `created_at` | `TIMESTAMPTZ` | NN     |

- `FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE`
- `UNIQUE (token_hash)`
- `CHECK (expires_at > created_at)`
- `token_hash` is the SHA-256 hex digest of the random token sent in the email link. The token itself is never stored.
- A token can be used while `used_at IS NULL AND expires_at > now()`. Setting `used_at` both consumes and revokes a token.

## Delete behaviour

- A cascade never deletes catalog rows or borrowing history.
- A book's `book_authors` rows are deleted together with the book.
- An author can't be deleted while a book still uses it.
- To retire a copy, set `withdrawn_at`. To retire a user who has borrowings, set `anonymized_at`.
- A user's sessions and reset tokens are deleted together with the user. They hold no history worth keeping once the account is gone.

| Foreign key                     | References    | On delete |
| ------------------------------- | ------------- | --------- |
| `books.publisher_id`            | `publishers`  | RESTRICT  |
| `book_authors.book_id`          | `books`       | CASCADE   |
| `book_authors.author_id`        | `authors`     | RESTRICT  |
| `book_copies.book_id`           | `books`       | RESTRICT  |
| `borrowings.book_copy_id`       | `book_copies` | RESTRICT  |
| `borrowings.user_id`            | `users`       | RESTRICT  |
| `sessions.user_id`              | `users`       | CASCADE   |
| `password_reset_tokens.user_id` | `users`       | CASCADE   |

## Indexes

Create these in addition to the ones the constraints already make:

| Index                                           | Used for                       |
| ----------------------------------------------- | ------------------------------ |
| `books (publisher_id)`                          | Books by a publisher           |
| `book_authors (author_id)`                      | Books by an author             |
| `book_copies (book_id)`                         | Copies of a book               |
| `borrowings (user_id)`                          | A user's borrowing history     |
| `borrowings (book_copy_id)`                     | A copy's full history          |
| `borrowings (due_at) WHERE returned_at IS NULL` | Overdue list                   |
| `sessions (user_id)`                            | Revoking a user's sessions     |
| `password_reset_tokens (user_id)`               | Revoking a user's reset tokens |

Every primary key, every `UNIQUE` constraint, the `lower(email)` index and the active-borrowing index already create an index of their own. The unique indexes on `refresh_token_hash` and `token_hash` also serve the token lookups.

## Application rules

These can't be written as simple constraints, so the application enforces them. Rules that guard a write are checked inside the same transaction as that write.

- A copy with `withdrawn_at` set can't be borrowed. Borrowing and withdrawing both start by locking the copy with `SELECT … FROM book_copies WHERE id = $1 FOR UPDATE`, so a withdrawal can't commit between a borrow's check and its insert.
- An action is allowed only if the permission map in code grants it to the user's role.
- The last admin can't lose the admin role.
- An anonymized user can't sign in or borrow.

How sign-in, token refresh, password reset and role changes read and write `sessions` and `password_reset_tokens` is defined in [Authentication and authorization](authentication-and-authorization.md).
