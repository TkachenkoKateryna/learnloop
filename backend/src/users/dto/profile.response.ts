import { Expose } from 'class-transformer';
import { Permission } from '../../authorization/permissions';
import { ROLE_PERMISSIONS } from '../../authorization/role-permissions';
import { Role } from '../../authorization/role.enum';
import { User } from '../entities/user.entity';

export class ProfileResponse {
  @Expose()
  id: string;

  @Expose()
  firstName: string;

  @Expose()
  lastName: string;

  @Expose()
  email: string;

  @Expose()
  role: Role;

  @Expose()
  permissions: Permission[];

  @Expose()
  createdAt: Date;

  @Expose()
  updatedAt: Date;

  constructor(user: User) {
    this.id = user.id;
    this.firstName = user.firstName;
    this.lastName = user.lastName;
    this.email = user.email;
    this.role = user.role;
    this.permissions = [...ROLE_PERMISSIONS[user.role]];
    this.createdAt = user.createdAt;
    this.updatedAt = user.updatedAt;
  }
}
