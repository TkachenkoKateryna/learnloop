import { ConflictException, Logger } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { SessionService } from '../src/users/session/session.service';
import { UserService } from '../src/users/user.service';
import { AuthService } from '../src/users/auth/auth.service';
import { Role } from '../src/authorization/role.enum';
import { Book } from '../src/books/entities/book.entity';
import { BookLanguage } from '../src/books/enums/book-language.enum';
import { Publisher } from '../src/publishers/entities/publisher.entity';
import { User } from '../src/users/entities/user.entity';
import { TestSetup } from './test-setup';

describe('AppController (e2e)', () => {
  let testSetup: TestSetup;

  beforeAll(async () => {
    testSetup = await TestSetup.create(AppModule);
  });

  afterEach(async () => {
    await testSetup.cleanup();
  });

  afterAll(async () => {
    await testSetup.teardown();
  });

  const testUser = {
    email: 'test@example.com',
    firstName: 'Test',
    lastName: 'User',
    password: 'Password123',
  };

  const login = async (password = testUser.password) => {
    const response = await request(testSetup.app.getHttpServer())
      .post('/auth/login')
      .send({ email: testUser.email, password, rememberMe: false })
      .expect(201);

    return {
      accessToken: (response.body as { accessToken: string }).accessToken,
      cookies: response.headers['set-cookie'] as unknown as string[],
    };
  };

  const getProfile = (accessToken: string) =>
    request(testSetup.app.getHttpServer())
      .get('/auth/profile')
      .set('Authorization', `Bearer ${accessToken}`);

  const waitForResetToken = async (): Promise<string> => {
    const { sendPasswordResetEmail } = testSetup.mailService;

    for (let attempt = 0; attempt < 50; attempt++) {
      const [, resetUrl] = sendPasswordResetEmail.mock.calls.at(-1) ?? [];

      if (resetUrl) {
        return new URL(resetUrl).searchParams.get('token')!;
      }
      await new Promise((resolve) => setTimeout(resolve, 20));
    }

    throw new Error('No password reset email was sent');
  };

  it('/ (GET)', () => {
    return request(testSetup.app.getHttpServer())
      .get('/')
      .expect(200)
      .expect('Hello World!');
  });

  describe('/auth/register (POST)', () => {
    it('creates a new user', async () => {
      const response = await request(testSetup.app.getHttpServer())
        .post('/auth/register')
        .send(testUser)
        .expect(201);

      expect(response.body).toMatchObject({
        email: testUser.email,
        firstName: testUser.firstName,
        lastName: testUser.lastName,
      });
      expect(response.body).not.toHaveProperty('password');
    });

    it('rejects a duplicate email', async () => {
      await request(testSetup.app.getHttpServer())
        .post('/auth/register')
        .send(testUser)
        .expect(201);

      await request(testSetup.app.getHttpServer())
        .post('/auth/register')
        .send(testUser)
        .expect(409);
    });

    it('stores the email trimmed and lowercased', async () => {
      const response = await request(testSetup.app.getHttpServer())
        .post('/auth/register')
        .send({ ...testUser, email: '  Test@Example.COM ' })
        .expect(201);

      expect(response.body).toMatchObject({ email: 'test@example.com' });
    });

    it('rejects an email that differs only in case', async () => {
      await request(testSetup.app.getHttpServer())
        .post('/auth/register')
        .send(testUser)
        .expect(201);

      await request(testSetup.app.getHttpServer())
        .post('/auth/register')
        .send({ ...testUser, email: testUser.email.toUpperCase() })
        .expect(409);
    });

    it('creates only one account when the same email registers twice at once', async () => {
      const register = () =>
        request(testSetup.app.getHttpServer())
          .post('/auth/register')
          .send(testUser);

      const responses = await Promise.all([register(), register()]);

      expect(responses.map((response) => response.status).sort()).toEqual([
        201, 409,
      ]);
    });

    it('rejects an invalid payload', async () => {
      await request(testSetup.app.getHttpServer())
        .post('/auth/register')
        .send({ ...testUser, email: 'not-an-email' })
        .expect(400);
    });

    it('creates a member even when the request asks for admin', async () => {
      await request(testSetup.app.getHttpServer())
        .post('/auth/register')
        .send({ ...testUser, role: Role.Admin })
        .expect(201);

      const user = await testSetup.app
        .get(UserService)
        .findOneByEmail(testUser.email);
      expect(user?.role).toBe(Role.Member);
    });
  });

  describe('/auth/login (POST)', () => {
    beforeEach(async () => {
      await request(testSetup.app.getHttpServer())
        .post('/auth/register')
        .send(testUser)
        .expect(201);
    });

    it('logs in with valid credentials', async () => {
      const response = await request(testSetup.app.getHttpServer())
        .post('/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password,
          rememberMe: false,
        })
        .expect(201);

      const { accessToken } = response.body as { accessToken: string };

      expect(typeof accessToken).toBe('string');
      expect(accessToken.split('.')).toHaveLength(3);
    });

    it('matches the email regardless of case and surrounding spaces', async () => {
      await request(testSetup.app.getHttpServer())
        .post('/auth/login')
        .send({
          email: ` ${testUser.email.toUpperCase()} `,
          password: testUser.password,
          rememberMe: false,
        })
        .expect(201);
    });

    it('rejects an incorrect password', async () => {
      await request(testSetup.app.getHttpServer())
        .post('/auth/login')
        .send({
          email: testUser.email,
          password: 'WrongPassword123',
          rememberMe: false,
        })
        .expect(401);
    });

    it('rejects an unknown email', async () => {
      await request(testSetup.app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'unknown@example.com',
          password: testUser.password,
          rememberMe: false,
        })
        .expect(401);
    });

    it('rejects an invalid payload', async () => {
      await request(testSetup.app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'not-an-email', password: '', rememberMe: false })
        .expect(400);
    });
  });

  describe('/auth/profile (GET)', () => {
    const login = async (): Promise<string> => {
      const response = await request(testSetup.app.getHttpServer())
        .post('/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password,
          rememberMe: false,
        })
        .expect(201);

      const { accessToken } = response.body as { accessToken: string };

      return accessToken;
    };

    beforeEach(async () => {
      await request(testSetup.app.getHttpServer())
        .post('/auth/register')
        .send(testUser)
        .expect(201);
    });

    it('returns the authenticated user without the password', async () => {
      const accessToken = await login();

      const response = await request(testSetup.app.getHttpServer())
        .get('/auth/profile')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        email: testUser.email,
        firstName: testUser.firstName,
        lastName: testUser.lastName,
        role: 'member',
        permissions: ['books:read'],
      });
      expect(response.body).not.toHaveProperty('password');
    });

    it('rejects a request without an Authorization header', async () => {
      await request(testSetup.app.getHttpServer())
        .get('/auth/profile')
        .expect(401);
    });

    it('rejects a request with a malformed Authorization header', async () => {
      const accessToken = await login();

      await request(testSetup.app.getHttpServer())
        .get('/auth/profile')
        .set('Authorization', accessToken)
        .expect(401);
    });

    it('rejects a request with an invalid token', async () => {
      await request(testSetup.app.getHttpServer())
        .get('/auth/profile')
        .set('Authorization', 'Bearer not-a-real-token')
        .expect(401);
    });
  });

  describe('books authorization', () => {
    let bookId: string;
    let publisherId: string;

    const newBook = () => ({
      title: 'New Book',
      isbn: '9781861972712',
      language: BookLanguage.ENGLISH,
      publicationDate: '2020-01-01',
      publisherId,
    });

    const setRole = async (role: Role) => {
      const user = await testSetup.app
        .get(UserService)
        .findOneByEmail(testUser.email);
      await testSetup.app.get(AuthService).changeRole(user!, role);
    };

    const loginAs = async (role: Role): Promise<string> => {
      await setRole(role);

      const { accessToken } = await login();
      return accessToken;
    };

    beforeEach(async () => {
      await request(testSetup.app.getHttpServer())
        .post('/auth/register')
        .send(testUser)
        .expect(201);

      const publisher = await testSetup.dataSource
        .getRepository(Publisher)
        .save({ name: 'Test Publisher' });
      publisherId = publisher.id;

      const book = await testSetup.dataSource.getRepository(Book).save({
        title: 'Existing Book',
        isbn: '9780306406157',
        language: BookLanguage.ENGLISH,
        publicationDate: new Date('2020-01-01'),
        publisherId,
      });
      bookId = book.id;
    });

    type Method = 'get' | 'post' | 'patch' | 'delete';

    const send = (method: Method, path: string, accessToken?: string) => {
      const url = path.replace(':id', bookId);
      const req = request(testSetup.app.getHttpServer())[method](url);

      if (accessToken) {
        req.set('Authorization', `Bearer ${accessToken}`);
      }
      if (method === 'post') {
        req.send(newBook());
      }
      if (method === 'patch') {
        req.send({ title: 'Updated Title' });
      }

      return req;
    };

    it.each<[Role, Method, string, number]>([
      [Role.Member, 'get', '/books', 200],
      [Role.Member, 'get', '/books/:id', 200],
      [Role.Member, 'post', '/books', 403],
      [Role.Member, 'patch', '/books/:id', 403],
      [Role.Member, 'delete', '/books/:id', 403],
      [Role.Librarian, 'get', '/books', 200],
      [Role.Librarian, 'get', '/books/:id', 200],
      [Role.Librarian, 'post', '/books', 201],
      [Role.Librarian, 'patch', '/books/:id', 200],
      [Role.Librarian, 'delete', '/books/:id', 403],
      [Role.Admin, 'get', '/books', 200],
      [Role.Admin, 'get', '/books/:id', 200],
      [Role.Admin, 'post', '/books', 201],
      [Role.Admin, 'patch', '/books/:id', 200],
      [Role.Admin, 'delete', '/books/:id', 200],
    ])('%s %s %s -> %d', async (role, method, path, status) => {
      const accessToken = await loginAs(role);

      await send(method, path, accessToken).expect(status);
    });

    it.each<[Method, string]>([
      ['get', '/books'],
      ['post', '/books'],
      ['delete', '/books/:id'],
    ])(
      'returns 401, not 403, for %s %s without a token',
      async (method, path) => {
        await send(method, path).expect(401);
      },
    );

    it('signs the user out on a role change, and the next login has the new role', async () => {
      const oldToken = await loginAs(Role.Member);
      await send('post', '/books', oldToken).expect(403);

      await setRole(Role.Librarian);
      await send('post', '/books', oldToken).expect(401);

      const { accessToken } = await login();
      await send('post', '/books', accessToken).expect(201);
      const profile = await getProfile(accessToken).expect(200);
      expect(profile.body).toMatchObject({ role: Role.Librarian });
    });

    it('rejects an id that is not a UUID with 400', async () => {
      const accessToken = await loginAs(Role.Member);

      await request(testSetup.app.getHttpServer())
        .get('/books/not-a-uuid')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(400);
    });
  });

  describe('last admin', () => {
    const otherUser = { ...testUser, email: 'other@example.com' };

    const findUser = (email: string) =>
      testSetup.app.get(UserService).findOneByEmail(email);

    const changeRole = async (email: string, role: Role) =>
      testSetup.app.get(AuthService).changeRole((await findUser(email))!, role);

    const countAdmins = () =>
      testSetup.dataSource.getRepository(User).countBy({ role: Role.Admin });

    beforeEach(async () => {
      for (const user of [testUser, otherUser]) {
        await request(testSetup.app.getHttpServer())
          .post('/auth/register')
          .send(user)
          .expect(201);
        await changeRole(user.email, Role.Admin);
      }
    });

    it('cannot lose the admin role', async () => {
      await changeRole(otherUser.email, Role.Member);

      await expect(changeRole(testUser.email, Role.Librarian)).rejects.toThrow(
        ConflictException,
      );
      expect((await findUser(testUser.email))?.role).toBe(Role.Admin);
    });

    it('stays an admin when two admins are demoted at the same time', async () => {
      const userService = testSetup.app.get<UserService>(UserService);
      const lockAdminIds = userService.lockAdminIds.bind(
        userService,
      ) as UserService['lockAdminIds'];
      // Holds each transaction open after the check, so without the row lock
      // both demotions would see two admins and both commit.
      const spy = jest
        .spyOn(userService, 'lockAdminIds')
        .mockImplementation(async (manager) => {
          const ids = await lockAdminIds(manager);
          await new Promise((resolve) => setTimeout(resolve, 100));
          return ids;
        });

      try {
        const results = await Promise.allSettled([
          changeRole(testUser.email, Role.Member),
          changeRole(otherUser.email, Role.Member),
        ]);

        expect(results.map(({ status }) => status).sort()).toEqual([
          'fulfilled',
          'rejected',
        ]);
        expect(await countAdmins()).toBe(1);
      } finally {
        spy.mockRestore();
      }
    });
  });

  describe('access tokens of a revoked session', () => {
    beforeEach(async () => {
      await request(testSetup.app.getHttpServer())
        .post('/auth/register')
        .send(testUser)
        .expect(201);
    });

    it('are rejected after logout', async () => {
      const { accessToken, cookies } = await login();
      await getProfile(accessToken).expect(200);

      await request(testSetup.app.getHttpServer())
        .post('/auth/logout')
        .set('Cookie', cookies)
        .expect(204);

      await getProfile(accessToken).expect(401);
    });

    it('are rejected after a password reset, while a new login works', async () => {
      const { accessToken } = await login();

      await request(testSetup.app.getHttpServer())
        .post('/auth/forgot-password')
        .send({ email: testUser.email })
        .expect(200);
      const token = await waitForResetToken();

      await request(testSetup.app.getHttpServer())
        .post('/auth/reset-password')
        .send({ token, newPassword: 'NewPassword123' })
        .expect(200);

      await getProfile(accessToken).expect(401);

      const { accessToken: newAccessToken } = await login('NewPassword123');
      await getProfile(newAccessToken).expect(200);
    });
  });

  describe('/auth/reset-password (POST)', () => {
    it.each([123, [], {}, 'not-a-token'])(
      'rejects token %j with 400',
      async (token) => {
        await request(testSetup.app.getHttpServer())
          .post('/auth/reset-password')
          .send({ token, newPassword: 'NewPassword123' })
          .expect(400);
      },
    );

    it('rolls back the whole reset when a step fails, so the link can be retried', async () => {
      await request(testSetup.app.getHttpServer())
        .post('/auth/register')
        .send(testUser)
        .expect(201);
      await request(testSetup.app.getHttpServer())
        .post('/auth/forgot-password')
        .send({ email: testUser.email })
        .expect(200);
      const token = await waitForResetToken();

      const revokeSessions = jest
        .spyOn(testSetup.app.get(SessionService), 'revokeAllForUser')
        .mockRejectedValueOnce(new Error('database unavailable'));
      const logError = jest
        .spyOn(Logger.prototype, 'error')
        .mockImplementation(() => undefined);

      try {
        await request(testSetup.app.getHttpServer())
          .post('/auth/reset-password')
          .send({ token, newPassword: 'NewPassword123' })
          .expect(500);
      } finally {
        revokeSessions.mockRestore();
        logError.mockRestore();
      }

      // Nothing was saved: the old password still works and the link is unused.
      await login();
      await request(testSetup.app.getHttpServer())
        .post('/auth/reset-password')
        .send({ token, newPassword: 'NewPassword123' })
        .expect(200);
      await login('NewPassword123');
    });
  });
});
