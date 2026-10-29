import { ALL_PERMISSIONS, Permission, Permissions } from './permissions';
import { hasPermission, ROLE_PERMISSIONS } from './role-permissions';
import { Role } from './role.enum';

const MATRIX: Record<Permission, Record<Role, boolean>> = {
  'books:read': { admin: true, librarian: true, member: true },
  'books:create': { admin: true, librarian: true, member: false },
  'books:update': { admin: true, librarian: true, member: false },
  'books:delete': { admin: true, librarian: false, member: false },
  'users:read': { admin: true, librarian: false, member: false },
  'users:create': { admin: true, librarian: false, member: false },
  'users:update': { admin: true, librarian: false, member: false },
  'users:delete': { admin: true, librarian: false, member: false },
};

const cases = ALL_PERMISSIONS.flatMap((permission) =>
  Object.values(Role).map(
    (role) => [role, permission, MATRIX[permission][role]] as const,
  ),
);

describe('hasPermission', () => {
  it.each(cases)('%s / %s -> %s', (role, permission, expected) => {
    expect(hasPermission(role, permission)).toBe(expected);
  });
});

describe('Permissions catalog', () => {
  it.each(Object.entries(Permissions))(
    '%s keys start with their group name',
    (group, keys) => {
      for (const key of Object.values(keys)) {
        expect(key.startsWith(`${group.toLowerCase()}:`)).toBe(true);
      }
    },
  );

  it('has no duplicate keys', () => {
    expect(new Set(ALL_PERMISSIONS).size).toBe(ALL_PERMISSIONS.length);
  });

  it('grants Admin every permission, including newly added ones', () => {
    expect(ROLE_PERMISSIONS[Role.Admin]).toEqual(ALL_PERMISSIONS);
  });

  it.each(Object.values(Role))('%s has no duplicate grants', (role) => {
    const grants = ROLE_PERMISSIONS[role];
    expect(new Set(grants).size).toBe(grants.length);
  });
});
