import { Expose } from 'class-transformer';
import {
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

export const USER_EMAIL_UNIQUE = 'UQ_user_email';

@Entity()
@Index(USER_EMAIL_UNIQUE, ['email'], { unique: true })
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
