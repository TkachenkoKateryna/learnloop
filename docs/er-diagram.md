# Library database: ER diagram

**Database:** PostgreSQL, 11 tables
**Diagram:** [er-diagram.svg](er-diagram.svg)

![Entity relationship diagram of the library schema](er-diagram.svg)

## Conventions

- Tables use plural snake_case names (`users`, `book_copies`), so none of them clash with SQL reserved words.
- Every entity table has a `BIGSERIAL` surrogate key named `id`. Junction tables use a composite primary key made of their two foreign keys.
- All points in time are `TIMESTAMPTZ`.
- Columns without **NN** are optional.

| Marker | Meaning     |
| ------ | ----------- |
| PK     | Primary key |
| FK     | Foreign key |
| NN     | Not null    |
| UQ     | Unique      |

Tables are grouped by area: **catalog** (publishers, books, authors, book_authors), **circulation** (book_copies, borrowings) and **access** (users, roles, permissions, user_roles, role_permissions).

## Relationships

| Parent        | Child              | Through FK                       | Cardinality |
| ------------- | ------------------ | -------------------------------- | ----------- |
| `publishers`  | `books`            | `books.publisher_id`             | 1 to 0..N   |
| `books`       | `book_copies`      | `book_copies.book_id`            | 1 to 0..N   |
| `books`       | `book_authors`     | `book_authors.book_id`           | 1 to 0..N   |
| `authors`     | `book_authors`     | `book_authors.author_id`         | 1 to 0..N   |
| `book_copies` | `borrowings`       | `borrowings.book_copy_id`        | 1 to 0..N   |
| `users`       | `borrowings`       | `borrowings.user_id`             | 1 to 0..N   |
| `users`       | `user_roles`       | `user_roles.user_id`             | 1 to 0..N   |
| `roles`       | `user_roles`       | `user_roles.role_id`             | 1 to 0..N   |
| `roles`       | `role_permissions` | `role_permissions.role_id`       | 1 to 0..N   |
| `permissions` | `role_permissions` | `role_permissions.permission_id` | 1 to 0..N   |

`books` and `authors` are many-to-many through `book_authors`. `users` and `roles`, and `roles` and `permissions`, are many-to-many through `user_roles` and `role_permissions`.

## Tables

### publishers

| Column       | Type           | Keys   |
| ------------ | -------------- | ------ |
| `id`         | `BIGSERIAL`    | PK     |
| `name`       | `VARCHAR(255)` | NN, UQ |
| `created_at` | `TIMESTAMPTZ`  | NN     |
| `updated_at` | `TIMESTAMPTZ`  | NN     |

- `UNIQUE (name)`

### books

| Column             | Type           | Keys   |
| ------------------ | -------------- | ------ |
| `id`               | `BIGSERIAL`    | PK     |
| `publisher_id`     | `BIGINT`       | FK, NN |
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
| `id`         | `BIGSERIAL`    | PK   |
| `name`       | `VARCHAR(255)` | NN   |
| `created_at` | `TIMESTAMPTZ`  | NN   |
| `updated_at` | `TIMESTAMPTZ`  | NN   |

`name` is not unique, because different authors can share a name.

### book_authors

| Column         | Type       | Keys   |
| -------------- | ---------- | ------ |
| `book_id`      | `BIGINT`   | PK, FK |
| `author_id`    | `BIGINT`   | PK, FK |
| `author_order` | `SMALLINT` | NN     |

- `PRIMARY KEY (book_id, author_id)`
- `UNIQUE (book_id, author_order)`
- `CHECK (author_order >= 1)`
- `FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE`
- `FOREIGN KEY (author_id) REFERENCES authors(id) ON DELETE RESTRICT`

### book_copies

| Column              | Type            | Keys   |
| ------------------- | --------------- | ------ |
| `id`                | `BIGSERIAL`     | PK     |
| `book_id`           | `BIGINT`        | FK, NN |
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
| `id`           | `BIGSERIAL`   | PK     |
| `user_id`      | `BIGINT`      | FK, NN |
| `book_copy_id` | `BIGINT`      | FK, NN |
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
| `id`            | `BIGSERIAL`    | PK     |
| `first_name`    | `VARCHAR(100)` | NN     |
| `last_name`     | `VARCHAR(100)` | NN     |
| `email`         | `VARCHAR(255)` | NN, UQ |
| `password_hash` | `VARCHAR(255)` | NN     |
| `date_of_birth` | `DATE`         |        |
| `anonymized_at` | `TIMESTAMPTZ`  |        |
| `created_at`    | `TIMESTAMPTZ`  | NN     |
| `updated_at`    | `TIMESTAMPTZ`  | NN     |

- `UNIQUE INDEX (lower(email))`: uniqueness ignores case.
- `anonymized_at` is set instead of deleting a user who has borrowing history.

### roles

| Column | Type           | Keys   |
| ------ | -------------- | ------ |
| `id`   | `BIGSERIAL`    | PK     |
| `name` | `VARCHAR(100)` | NN, UQ |

- `UNIQUE (name)`

### permissions

| Column     | Type           | Keys |
| ---------- | -------------- | ---- |
| `id`       | `BIGSERIAL`    | PK   |
| `resource` | `VARCHAR(100)` | NN   |
| `action`   | `VARCHAR(100)` | NN   |

- `UNIQUE (resource, action)`

### user_roles

| Column    | Type     | Keys   |
| --------- | -------- | ------ |
| `user_id` | `BIGINT` | PK, FK |
| `role_id` | `BIGINT` | PK, FK |

- `PRIMARY KEY (user_id, role_id)`
- `FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE`
- `FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE RESTRICT`

### role_permissions

| Column          | Type     | Keys   |
| --------------- | -------- | ------ |
| `role_id`       | `BIGINT` | PK, FK |
| `permission_id` | `BIGINT` | PK, FK |

- `PRIMARY KEY (role_id, permission_id)`
- `FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE`
- `FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE RESTRICT`

## Delete behaviour

- A cascade never deletes catalog rows or borrowing history.
- A junction row is deleted together with the row that owns it: a book's `book_authors`, a user's `user_roles`, a role's `role_permissions`.
- An author, role or permission can't be deleted while something still uses it.
- To retire a copy, set `withdrawn_at`. To retire a user who has borrowings, set `anonymized_at`.

| Foreign key                      | References    | On delete |
| -------------------------------- | ------------- | --------- |
| `books.publisher_id`             | `publishers`  | RESTRICT  |
| `book_authors.book_id`           | `books`       | CASCADE   |
| `book_authors.author_id`         | `authors`     | RESTRICT  |
| `book_copies.book_id`            | `books`       | RESTRICT  |
| `borrowings.book_copy_id`        | `book_copies` | RESTRICT  |
| `borrowings.user_id`             | `users`       | RESTRICT  |
| `user_roles.user_id`             | `users`       | CASCADE   |
| `user_roles.role_id`             | `roles`       | RESTRICT  |
| `role_permissions.role_id`       | `roles`       | CASCADE   |
| `role_permissions.permission_id` | `permissions` | RESTRICT  |

## Indexes

Create these in addition to the ones the constraints already make:

| Index                                           | Used for                      |
| ----------------------------------------------- | ----------------------------- |
| `books (publisher_id)`                          | Books by a publisher          |
| `book_authors (author_id)`                      | Books by an author            |
| `book_copies (book_id)`                         | Copies of a book              |
| `borrowings (user_id)`                          | A user's borrowing history    |
| `borrowings (book_copy_id)`                     | A copy's full history         |
| `borrowings (due_at) WHERE returned_at IS NULL` | Overdue list                  |
| `user_roles (role_id)`                          | Users with a role             |
| `role_permissions (permission_id)`              | Roles that grant a permission |

Every primary key, every `UNIQUE` constraint, the `lower(email)` index and the active-borrowing index already create an index of their own.

## Application rules

These can't be written as simple constraints. The service layer checks them inside the same transaction as the write.

- A copy with `withdrawn_at` set can't be borrowed. Borrowing and withdrawing both start by locking the copy with `SELECT … FROM book_copies WHERE id = $1 FOR UPDATE`, so a withdrawal can't commit between a borrow's check and its insert.
- Every user has at least one role.
- An action is allowed only if one of the user's roles grants the matching permission.
- An anonymized user can't sign in or borrow.
