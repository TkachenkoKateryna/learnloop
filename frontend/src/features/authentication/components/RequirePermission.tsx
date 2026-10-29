import { Outlet } from 'react-router-dom';
import { useCan } from '../hooks/useCan';
import type { Permission } from '../types/auth';
import AccessDenied from './AccessDenied';

interface RequirePermissionProps {
  permission: Permission;
}

const RequirePermission = ({ permission }: RequirePermissionProps) => {
  const canAccess = useCan(permission);

  return canAccess ? <Outlet /> : <AccessDenied />;
};

export default RequirePermission;
