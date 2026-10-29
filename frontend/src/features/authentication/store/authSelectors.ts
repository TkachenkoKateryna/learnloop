import type { RootState } from '../../../store';
import type { Permission } from '../types/auth';

export const selectUser = (state: RootState) => state.auth.user;

export const selectIsAuthenticated = (state: RootState) =>
  state.auth.user !== null;

export const selectHasPermission = (
  state: RootState,
  permission: Permission,
): boolean => state.auth.user?.permissions.includes(permission) ?? false;
