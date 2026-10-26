export const Permissions = {
  Books: {
    Read: 'books:read',
    Create: 'books:create',
    Update: 'books:update',
    Delete: 'books:delete',
  },
  Users: {
    Read: 'users:read',
    Create: 'users:create',
    Update: 'users:update',
    Delete: 'users:delete',
  },
} as const;

type Values<T> = T[keyof T];

export type Permission = Values<{
  [R in keyof typeof Permissions]: Values<(typeof Permissions)[R]>;
}>;

export const ALL_PERMISSIONS: readonly Permission[] = Object.freeze(
  Object.values(Permissions).flatMap(
    (group) => Object.values(group) as Permission[],
  ),
);
