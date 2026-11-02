import { ConflictException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { UserService } from './user.service';
import { User, USER_EMAIL_UNIQUE } from './entities/user.entity';
import { NewUser } from './interfaces/new-user';
import { postgresQueryError } from '../database/postgres-errors.testing';

const uniqueViolation = (constraint: string) =>
  postgresQueryError({ code: '23505', constraint });

describe('UserService', () => {
  let service: UserService;
  let userRepository: {
    create: jest.Mock<User, [Partial<User>]>;
    save: jest.Mock<Promise<User>, [User]>;
  };

  const newUser: NewUser = {
    email: 'kate@example.com',
    firstName: 'Kate',
    lastName: 'Doe',
    passwordHash: 'already-hashed',
  };

  beforeEach(async () => {
    userRepository = {
      create: jest.fn((data: Partial<User>) => data as User),
      save: jest.fn((user: User) => Promise.resolve({ ...user, id: 'user-1' })),
    };

    const module = await Test.createTestingModule({
      providers: [
        UserService,
        { provide: getRepositoryToken(User), useValue: userRepository },
      ],
    }).compile();

    service = module.get(UserService);
  });

  describe('createUser', () => {
    it('stores the given password hash without re-hashing it', async () => {
      const user = await service.createUser(newUser);

      expect(user).toMatchObject({ id: 'user-1', email: newUser.email });
      expect(userRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ password: 'already-hashed' }),
      );
    });

    it('stores the email trimmed and lowercased', async () => {
      await service.createUser({ ...newUser, email: ' Kate@Example.COM ' });

      expect(userRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ email: 'kate@example.com' }),
      );
    });

    it('reports a taken email that hits the constraint as a conflict', async () => {
      userRepository.save.mockRejectedValue(uniqueViolation(USER_EMAIL_UNIQUE));

      await expect(service.createUser(newUser)).rejects.toThrow(
        ConflictException,
      );
    });

    it('lets a violation of a different unique constraint through', async () => {
      const otherViolation = uniqueViolation('UQ_some_other_rule');
      userRepository.save.mockRejectedValue(otherViolation);

      await expect(service.createUser(newUser)).rejects.toBe(otherViolation);
    });

    it('lets other database errors through', async () => {
      userRepository.save.mockRejectedValue(new Error('connection lost'));

      await expect(service.createUser(newUser)).rejects.toThrow(
        'connection lost',
      );
    });
  });
});
