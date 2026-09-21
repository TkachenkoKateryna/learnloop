import request from 'supertest';
import { AppModule } from '../src/app.module';
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
});
