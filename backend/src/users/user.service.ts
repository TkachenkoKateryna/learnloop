import { ConflictException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { User, USER_EMAIL_UNIQUE } from './entities/user.entity';
import { EntityManager, Repository } from 'typeorm';
import { CreateUserDto } from './dto/create-user.dto';
import {
  isPostgresError,
  PostgresErrorCode,
} from '../database/postgres-errors';
import { Role } from '../authorization/role.enum';

const EMAIL_TAKEN_MESSAGE = 'Email already exists';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User) private readonly userRepository: Repository<User>,
  ) {}

  public async findOneByEmail(email: string): Promise<User | null> {
    return await this.userRepository.findOneBy({ email });
  }

  // createUserDto.password must already be hashed; it is stored as given.
  public async createUser(createUserDto: CreateUserDto): Promise<User> {
    if (await this.findOneByEmail(createUserDto.email)) {
      throw new ConflictException(EMAIL_TAKEN_MESSAGE);
    }

    const user = this.userRepository.create(createUserDto);

    try {
      return await this.userRepository.save(user);
    } catch (error) {
      if (
        isPostgresError(
          error,
          PostgresErrorCode.UniqueViolation,
          USER_EMAIL_UNIQUE,
        )
      ) {
        throw new ConflictException(EMAIL_TAKEN_MESSAGE);
      }
      throw error;
    }
  }

  public async findOne(id: string): Promise<User | null> {
    return await this.userRepository.findOneBy({ id });
  }

  public async updatePasswordHash(
    id: string,
    passwordHash: string,
    manager?: EntityManager,
  ): Promise<void> {
    const repository = manager?.getRepository(User) ?? this.userRepository;

    await repository.update(id, { password: passwordHash });
  }

  public async updateRole(
    id: string,
    role: Role,
    manager?: EntityManager,
  ): Promise<void> {
    const repository = manager?.getRepository(User) ?? this.userRepository;

    await repository.update(id, { role });
  }

  public async lockAdminIds(manager: EntityManager): Promise<string[]> {
    const admins = await manager.getRepository(User).find({
      select: { id: true },
      where: { role: Role.Admin },
      lock: { mode: 'pessimistic_write' },
    });

    return admins.map(({ id }) => id);
  }
}
