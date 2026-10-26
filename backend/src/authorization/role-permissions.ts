import { ALL_PERMISSIONS, Permission, Permissions as P } from './permissions';
import { Role } from './role.enum';

export const ROLE_PERMISSIONS: Record<Role, readonly Permission[]> = {
  [Role.Admin]: ALL_PERMISSIONS,
  [Role.Librarian]: [P.Books.Read, P.Books.Create, P.Books.Update],
  [Role.Member]: [P.Books.Read],
};

const ROLE_PERMISSION_SETS = new Map(
  Object.values(Role).map((role) => [role, new Set(ROLE_PERMISSIONS[role])]),
);

export function hasPermission(role: Role, permission: Permission): boolean {
  return ROLE_PERMISSION_SETS.get(role)?.has(permission) ?? false;
}
