import { useAppSelector } from '../../../store/hooks';
import { selectHasPermission } from '../store/authSelectors';
import type { Permission } from '../types/auth';

export const useCan = (permission: Permission): boolean =>
  useAppSelector((state) => selectHasPermission(state, permission));
