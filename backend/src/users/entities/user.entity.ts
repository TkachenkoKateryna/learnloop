import { Expose } from 'class-transformer';
import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Session } from './session.entity';
import { PasswordResetToken } from './password-reset-token.entity';
import { Role } from '../../authorization/role.enum';

export const USER_EMAIL_UNIQUE = 'UQ_user_email';
export const USER_ROLE_CHECK = 'CHK_user_role';

const ROLE_VALUES = Object.values(Role)
  .map((role) => `'${role}'`)
  .join(', ');

@Entity()
@Index(USER_EMAIL_UNIQUE, ['email'], { unique: true })
@Check(USER_ROLE_CHECK, `"role" IN (${ROLE_VALUES})`)
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

  @OneToMany(() => Session, (session) => session.user)
  sessions: Session[];

  @OneToMany(() => PasswordResetToken, (token) => token.user)
  passwordResetTokens: PasswordResetToken[];
}
