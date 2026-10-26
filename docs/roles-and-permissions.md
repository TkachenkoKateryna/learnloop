# Libra — Roles & Permissions (Scope 1)

As of Oct 26, 2026 · [Living version](https://claude.ai/artifact/8zTHqZttqpW8RqFRVAUxjt)

## Overview

Scope 1 ships three fixed roles (Admin, Librarian, Member) with permissions defined in code as `resource:action` keys. Routes check permissions, never role names. The screens come from the Libra admin dashboard design (Figma Community preview file).

- Roles are fixed in scope 1: `ROLE_PERMISSIONS` lives in code and only `user.role` is stored in the DB.
- Anything not granted is denied. A global guard rejects any route without `@RequirePermissions` unless it is marked `@Public()`.
- Record-level rules (a member's own loans) are policy checks in services, not extra permission keys.

## Roles

The design is a staff dashboard (its user is shown as "Noah Tanaka, Admin"). The only member-facing screens are Login and Register, so the Member role is inferred from what the staff screens show about members.

| Role      | Value       | Who                          | What they do in the design                                                                         |
| --------- | ----------- | ---------------------------- | -------------------------------------------------------------------------------------------------- |
| Admin     | `admin`     | Library manager or owner     | Everything, plus finances (revenue, acquisitions), staff accounts, roles and settings              |
| Librarian | `librarian` | Front-desk and catalog staff | Day-to-day work: catalog, loans and returns, reservations, members, damaged or lost reports, inbox |
| Member    | `member`    | Registered patron            | Browses the catalog; sees and manages their own loans, reservations, fines and profile             |

## Screens and resources

The 14 desktop screens map onto 15 permission resources. Each screen also has tablet and mobile versions with the same features.

| Screen               | What it shows or does                                                                                                                                               | Resources                                               |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| Dashboard V1/V2      | KPI cards (borrowed, overdue, visitors, total books), usage trends, book categories, top books and authors, recent activity, revenue and revenue breakdown          | `dashboard`, `revenue`                                  |
| Inbox                | Mail from members (overdue follow-ups, renewals) with labels Reminders, Member Support, Book Requests; compose and reply                                            | `messages`                                              |
| Library Activity     | Log of borrows, returns and reservations with member, book, dates, status and fine                                                                                  | `activity`, `loans`                                     |
| Books (table, grid)  | Catalog with author, publisher, status (Available, Borrowed, Damaged), copies, shelf location, resource link; Add Book                                              | `books`                                                 |
| Book Details         | Metadata, synopsis, tags, reservation queue, borrowing trend, borrowing history with fines, related books                                                           | `books`, `reservations`, `loans`, `fines`               |
| Stock Management     | Stock overview (available, on loan, reserved, damaged/lost), low-stock list with Reorder, damaged/lost log with replacement status (Pending, Replaced, Written Off) | `stock`, `acquisitions`                                 |
| Supply & Acquisition | Vendors, book-list files, purchase price, invoice number, funding source (purchase, donation, grant, exchange)                                                      | `acquisitions`                                          |
| Members              | Member list with membership type (Basic, Standard, Premium), status (Active, Expired, Suspended), join and expiry dates, borrowed, overdue, fines; Add Member       | `members`                                               |
| Member Details       | Profile, contact info, borrowing trend, borrowed books, reservations, payment history (membership fees), fines (late, damage)                                       | `members`, `loans`, `reservations`, `payments`, `fines` |
| Add New Member       | Staff-created member form                                                                                                                                           | `members`                                               |
| Login, Register      | Public sign-in and self-registration                                                                                                                                | none (`@Public()`)                                      |
| Sidebar: Settings    | Settings entry, no screen designed                                                                                                                                  | `settings`                                              |
| Not in design        | Staff accounts and role changes                                                                                                                                     | `users`, `roles`                                        |

## Permission catalog

Scope 1 has 40 keys across 15 resources, each written as `resource:action`. Actions come from a fixed set: `read`, `create`, `update`, `delete`, plus a few domain verbs (`return`, `cancel`, `waive`, `send`, `assign`).

| Resource       | Keys                                                                                     | Covers                                                                                  |
| -------------- | ---------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| `dashboard`    | `dashboard:read`                                                                         | KPI cards, usage trends, categories, top books and authors, recent activity             |
| `revenue`      | `revenue:read`                                                                           | Revenue chart and revenue breakdown on the dashboard                                    |
| `activity`     | `activity:read`                                                                          | Library Activity log                                                                    |
| `books`        | `books:read`, `books:create`, `books:update`, `books:delete`                             | Catalog, book details, copies, shelf location                                           |
| `loans`        | `loans:read`, `loans:create`, `loans:return`, `loans:update`                             | Check-out, check-in, extending a due date                                               |
| `reservations` | `reservations:read`, `reservations:create`, `reservations:update`, `reservations:cancel` | Reservation queue; `update` marks one ready for pickup                                  |
| `members`      | `members:read`, `members:create`, `members:update`, `members:delete`                     | Member list, details, Add Member; `update` includes status (Active, Expired, Suspended) |
| `fines`        | `fines:read`, `fines:create`, `fines:waive`                                              | Late and damage fines                                                                   |
| `payments`     | `payments:read`, `payments:create`                                                       | Payment history; recording a membership fee or fine payment                             |
| `stock`        | `stock:read`, `stock:create`, `stock:update`                                             | Stock overview; reporting damaged or lost copies; setting replacement status            |
| `acquisitions` | `acquisitions:read`, `acquisitions:create`, `acquisitions:update`, `acquisitions:delete` | Vendors, purchases, invoices, funding source, Reorder                                   |
| `messages`     | `messages:read`, `messages:send`                                                         | Inbox                                                                                   |
| `settings`     | `settings:read`, `settings:update`                                                       | Library settings such as loan period and fine rates                                     |
| `users`        | `users:read`, `users:create`, `users:update`, `users:delete`                             | Staff accounts                                                                          |
| `roles`        | `roles:assign`                                                                           | Changing a user's role                                                                  |

## Role → permission matrix

Admin gets all 40 keys, Librarian 27, Member 9. "Own" means the key is granted but the service limits it to the member's own records (see Ownership rules).

| Permission            | Admin | Librarian | Member |
| --------------------- | ----- | --------- | ------ |
| `dashboard:read`      | Yes   | Yes       | No     |
| `revenue:read`        | Yes   | No        | No     |
| `activity:read`       | Yes   | Yes       | No     |
| `books:read`          | Yes   | Yes       | Yes    |
| `books:create`        | Yes   | Yes       | No     |
| `books:update`        | Yes   | Yes       | No     |
| `books:delete`        | Yes   | No        | No     |
| `loans:read`          | Yes   | Yes       | Own    |
| `loans:create`        | Yes   | Yes       | No     |
| `loans:return`        | Yes   | Yes       | No     |
| `loans:update`        | Yes   | Yes       | No     |
| `reservations:read`   | Yes   | Yes       | Own    |
| `reservations:create` | Yes   | Yes       | Own    |
| `reservations:update` | Yes   | Yes       | No     |
| `reservations:cancel` | Yes   | Yes       | Own    |
| `members:read`        | Yes   | Yes       | Own    |
| `members:create`      | Yes   | Yes       | No     |
| `members:update`      | Yes   | Yes       | Own    |
| `members:delete`      | Yes   | No        | No     |
| `fines:read`          | Yes   | Yes       | Own    |
| `fines:create`        | Yes   | Yes       | No     |
| `fines:waive`         | Yes   | No        | No     |
| `payments:read`       | Yes   | Yes       | Own    |
| `payments:create`     | Yes   | Yes       | No     |
| `stock:read`          | Yes   | Yes       | No     |
| `stock:create`        | Yes   | Yes       | No     |
| `stock:update`        | Yes   | Yes       | No     |
| `acquisitions:read`   | Yes   | Yes       | No     |
| `acquisitions:create` | Yes   | No        | No     |
| `acquisitions:update` | Yes   | No        | No     |
| `acquisitions:delete` | Yes   | No        | No     |
| `messages:read`       | Yes   | Yes       | No     |
| `messages:send`       | Yes   | Yes       | No     |
| `settings:read`       | Yes   | Yes       | No     |
| `settings:update`     | Yes   | No        | No     |
| `users:read`          | Yes   | No        | No     |
| `users:create`        | Yes   | No        | No     |
| `users:update`        | Yes   | No        | No     |
| `users:delete`        | Yes   | No        | No     |
| `roles:assign`        | Yes   | No        | No     |

The split follows one rule: Librarians run daily circulation, and anything involving money decisions, deletion or staff stays with Admin. That covers revenue, waiving fines, purchases, deleting books or members, settings, users and roles.

## Ownership rules

Member access is a permission plus a policy check in the service. The guard confirms the key, then the service limits the query to `memberId = currentUser.memberId`. Admin and Librarian skip the policy.

| Key (Member)                  | Policy                                                                                                     |
| ----------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `loans:read`                  | Only their own loans; list endpoints filter by member, detail endpoints return 404 for anyone else's       |
| `reservations:read`           | Only their own reservations; the book's reservation queue shows their position, not other members' names   |
| `reservations:create`         | Always for themselves; the request body has no `memberId`. Blocked when membership is Suspended or Expired |
| `reservations:cancel`         | Only their own, and only while status is pending or ready                                                  |
| `members:read`                | Only their own profile (`GET /members/me`)                                                                 |
| `members:update`              | Only their own contact fields; membership type, status and dates stay staff-only                           |
| `fines:read`, `payments:read` | Only their own                                                                                             |

Return 404, not 403, for another member's record, so IDs can't be probed. Keep these checks in services, not in extra keys like `loans:read:own`; scope 1 doesn't need both forms.

## Code

The matrix above as code, in `backend/src/authorization/`. The const object is the source of truth for both the seed and the guard.

```ts
// role.enum.ts
export enum Role {
  Admin = 'admin',
  Librarian = 'librarian',
  Member = 'member',
}
```

```ts
// permissions.ts
export const Permissions = {
  Dashboard: { Read: 'dashboard:read' },
  Revenue: { Read: 'revenue:read' },
  Activity: { Read: 'activity:read' },
  Books: {
    Read: 'books:read',
    Create: 'books:create',
    Update: 'books:update',
    Delete: 'books:delete',
  },
  Loans: {
    Read: 'loans:read',
    Create: 'loans:create',
    Return: 'loans:return',
    Update: 'loans:update',
  },
  Reservations: {
    Read: 'reservations:read',
    Create: 'reservations:create',
    Update: 'reservations:update',
    Cancel: 'reservations:cancel',
  },
  Members: {
    Read: 'members:read',
    Create: 'members:create',
    Update: 'members:update',
    Delete: 'members:delete',
  },
  Fines: { Read: 'fines:read', Create: 'fines:create', Waive: 'fines:waive' },
  Payments: { Read: 'payments:read', Create: 'payments:create' },
  Stock: { Read: 'stock:read', Create: 'stock:create', Update: 'stock:update' },
  Acquisitions: {
    Read: 'acquisitions:read',
    Create: 'acquisitions:create',
    Update: 'acquisitions:update',
    Delete: 'acquisitions:delete',
  },
  Messages: { Read: 'messages:read', Send: 'messages:send' },
  Settings: { Read: 'settings:read', Update: 'settings:update' },
  Users: {
    Read: 'users:read',
    Create: 'users:create',
    Update: 'users:update',
    Delete: 'users:delete',
  },
  Roles: { Assign: 'roles:assign' },
} as const;

type Values<T> = T[keyof T];
export type Permission = Values<{
  [R in keyof typeof Permissions]: Values<(typeof Permissions)[R]>;
}>;

export const ALL_PERMISSIONS = Object.values(Permissions).flatMap((group) =>
  Object.values(group),
) as Permission[];
```

```ts
// role-permissions.ts
import {
  Permissions as P,
  ALL_PERMISSIONS,
  type Permission,
} from './permissions';
import { Role } from './role.enum';

export const ROLE_PERMISSIONS: Record<Role, readonly Permission[]> = {
  [Role.Admin]: ALL_PERMISSIONS,
  [Role.Librarian]: [
    P.Dashboard.Read,
    P.Activity.Read,
    P.Books.Read,
    P.Books.Create,
    P.Books.Update,
    P.Loans.Read,
    P.Loans.Create,
    P.Loans.Return,
    P.Loans.Update,
    P.Reservations.Read,
    P.Reservations.Create,
    P.Reservations.Update,
    P.Reservations.Cancel,
    P.Members.Read,
    P.Members.Create,
    P.Members.Update,
    P.Fines.Read,
    P.Fines.Create,
    P.Payments.Read,
    P.Payments.Create,
    P.Stock.Read,
    P.Stock.Create,
    P.Stock.Update,
    P.Acquisitions.Read,
    P.Messages.Read,
    P.Messages.Send,
    P.Settings.Read,
  ],
  [Role.Member]: [
    P.Books.Read,
    P.Loans.Read,
    P.Reservations.Read,
    P.Reservations.Create,
    P.Reservations.Cancel,
    P.Members.Read,
    P.Members.Update,
    P.Fines.Read,
    P.Payments.Read,
  ],
};
```

Add a unit test that checks the counts (40, 27, 9) so any change to the matrix is deliberate and gets mirrored in this doc.

## Tradeoffs

The structure holds up for scope 1, and the permission check costs nothing (a Set lookup, no DB query). Three open fixes are necessary: member self-service moves to `/me` routes, revenue gets its own endpoint, and no user DTO accepts a role. Each is due when its endpoint is built, not now.

### Design choices

| Choice                                         | What we gain                                                                              | What it costs                                                                                                          |
| ---------------------------------------------- | ----------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| Catalog and role map in code, not DB tables    | One source of truth for guard, seed and frontend; no sync; no DB query per check          | Changing a role's grants needs a deploy; no custom roles without a redesign                                            |
| Grouped const object, not an enum              | Autocomplete by resource; plain strings that match DB and JSON values; derived union type | Each key's value is typed by hand, so it can drift from its group name                                                 |
| `Record<Role, …>` map                          | Adding a role fails the build until its grants are decided                                | Hard to see at a glance what a role lacks; the matrix test covers that                                                 |
| Admin gets `ALL_PERMISSIONS`                   | New keys reach Admin with no edit                                                         | A grant nobody reviews; a future key that Admin must not have needs an explicit list                                   |
| All 40 keys defined now                        | The guard can cover every endpoint from day one, and the matrix is reviewed once          | Most keys guard nothing yet. The authorization guide says to add keys when their feature is built, so the two disagree |
| Ownership as a service policy, not `:own` keys | Fewer keys; one meaning per key for staff                                                 | The same key means "any" for staff and "own" for members, which is the main risk below                                 |

### Risks and what is necessary

| Risk                                                                                           | Fix                                                                                                                                        | Necessary?                                   | Status                                     |
| ---------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------- | ------------------------------------------ |
| A Member key like `loans:read` gets used on a staff route, and members read everyone's records | Serve member self-service from `/me` routes that scope by the token's user. Member then keeps only `books:read`, and every key means "any" | Yes, before the first member-facing endpoint | Open; the matrix still lists 9 Member keys |
| Revenue leaks to Librarians through a shared dashboard response                                | Serve revenue from its own endpoint guarded by `revenue:read`                                                                              | Yes, when the dashboard endpoint is built    | Open                                       |
| `users:update` changes a role and bypasses `roles:assign`                                      | Leave `role` out of every user DTO; change roles only through the role endpoint                                                            | Yes, when user endpoints are built           | Open; covered by Stage 1.3 of the guide    |
| A key value doesn't match its group (`Books.Read = 'book:read'`)                               | Spec checks that every key starts with its group name                                                                                      | Yes                                          | Done                                       |
| A key is listed twice, or Admin silently loses keys                                            | Spec checks for duplicates and that Admin equals the full catalog                                                                          | Yes                                          | Done                                       |
| `members:update` covers both contact edits and suspension                                      | Split out `members:suspend` if Librarians shouldn't suspend                                                                                | No, decide with the Members feature          | Open                                       |
| `stock:create` doesn't say what it does                                                        | Rename it `stock:report`                                                                                                                   | No, but cheaper before the frontend uses it  | Open                                       |
| A linear scan on every check                                                                   | Set per role, built once at startup                                                                                                        | No, at 40 keys it's negligible               | Done                                       |

## Out of scope and open questions

Scope 1 has no custom roles, no per-user grants and no wildcard keys. Membership type (Basic, Standard, Premium) sets loan limits and fees, not permissions.

- [ ] Does a member added by staff (Add New Member) get a login, an email invite, or only a record? This decides whether every member has a `users` row.
- [ ] Register always creates `Role.Member`. Confirm the API ignores any `role` in the request body and that only `roles:assign` changes a role.
- [ ] The Reorder button on Stock Management needs `acquisitions:create`, which Librarians lack. Hide it for them, or add a request-approval step?
- [ ] Should Librarians waive small fines, for example below a set amount? That would be a policy on `fines:waive`, not a new key.
- [ ] Is Inbox a real email integration or in-app messages? If it is email, `messages` may move to a later scope.
- [ ] Settings, staff users and role management have no screens yet. Their permissions are defined now so the guard covers the API from day one.
