import { Logger } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { SessionService } from '../src/users/session/session.service';
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
