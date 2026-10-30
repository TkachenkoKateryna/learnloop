import { ConflictException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { QueryFailedError } from 'typeorm';
import { UserService } from './user.service';
import { User, USER_EMAIL_UNIQUE } from './entities/user.entity';
import { NewUser } from './interfaces/new-user';

const uniqueViolation = (constraint: string) =>
  new QueryFailedError(
    'INSERT',
    [],
    Object.assign(new Error('duplicate key'), { code: '23505', constraint }),
  );

describe('UserService', () => {
  let service: UserService;
  let userRepository: {
    findOneBy: jest.Mock<Promise<User | null>, [Partial<User>]>;
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
      findOneBy: jest.fn<Promise<User | null>, [Partial<User>]>(() =>
        Promise.resolve(null),
      ),
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

    it('rejects an email that is already registered, without saving', async () => {
      userRepository.findOneBy.mockResolvedValue({ id: 'existing' } as User);

      await expect(service.createUser(newUser)).rejects.toThrow(
        ConflictException,
      );
      expect(userRepository.save).not.toHaveBeenCalled();
    });

    it('reports a parallel signup that hits the email constraint as a conflict', async () => {
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
