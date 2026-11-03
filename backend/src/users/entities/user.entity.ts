import { Expose } from 'class-transformer';
import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Role } from '../../authorization/role.enum';
import { checkName, sqlInList } from '../../database/sql';

const EMAIL_NORMALIZED = `"email" = lower(btrim("email"))`;
const ROLE_ALLOWED = `"role" IN (${sqlInList(Object.values(Role))})`;

export const USER_EMAIL_UNIQUE = 'uq_users_email';
export const USER_EMAIL_NORMALIZED_CHECK = checkName(
  'chk_users_email_normalized',
  EMAIL_NORMALIZED,
);
export const USER_ROLE_CHECK = checkName('chk_users_role', ROLE_ALLOWED);

@Entity('users')
@Index(USER_EMAIL_UNIQUE, ['email'], { unique: true })
@Check(USER_EMAIL_NORMALIZED_CHECK, EMAIL_NORMALIZED)
@Check(USER_ROLE_CHECK, ROLE_ALLOWED)
export class User {
  @PrimaryGeneratedColumn('uuid')
  @Expose()
  id: string;

  @Column()
  @Expose()
  firstName: string;

  @Column()
  @Expose()
  lastName: string;

  @Column()
  @Expose()
  email: string;

  @Column()
  password: string;

  @Column({ type: 'varchar', length: 20, default: Role.Member })
  role: Role;

  @CreateDateColumn({ type: 'timestamptz' })
  @Expose()
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  @Expose()
  updatedAt: Date;
}
