import request from 'supertest';
import { AppModule } from '../src/app.module';
import { TestSetup } from './test-setup';

// The main e2e suite runs with throttling skipped. This one leaves it on with
// a tiny global limit. Each test gets a fresh app, so the in-memory counters
// start from zero.
describe('Rate limiting (e2e)', () => {
  let testSetup: TestSetup;

  beforeEach(async () => {
    testSetup = await TestSetup.create(AppModule, {
      throttle: { ttl: 60_000, limit: 2, skip: false },
    });
  });

  afterEach(async () => {
    await testSetup.teardown();
  });

  const login = (email: string) =>
    request(testSetup.app.getHttpServer())
      .post('/auth/login')
      .send({ email, password: 'WrongPassword1', rememberMe: false });

  const getRoot = () => request(testSetup.app.getHttpServer()).get('/');

  it('returns 429 with Retry-After once the global limit is used up', async () => {
    const first = await getRoot().expect(200);
    const second = await getRoot().expect(200);
    const blocked = await getRoot().expect(429);

    expect(first.headers['x-ratelimit-remaining']).toBe('1');
    expect(second.headers['x-ratelimit-remaining']).toBe('0');
    expect(Number(blocked.headers['retry-after'])).toBeGreaterThan(0);
  });

  it('counts login attempts per email', async () => {
    for (let attempt = 0; attempt < 5; attempt++) {
      await login('alice@example.com').expect(401);
    }

    await login('alice@example.com').expect(429);
    await login('bob@example.com').expect(401);
  });

  it('caps login attempts per IP across emails', async () => {
    let blocked: request.Response | undefined;

    for (let attempt = 0; attempt <= 20 && !blocked; attempt++) {
      const response = await login(`user${attempt}@example.com`);

      if (response.status === 429) {
        blocked = response;
      } else {
        expect(response.status).toBe(401);
      }
    }

    expect(blocked).toBeDefined();
    expect(Number(blocked?.headers['retry-after-login-ip'])).toBeGreaterThan(0);
  });

  it('limits forgot-password requests, so a script cannot flood an inbox', async () => {
    const forgotPassword = () =>
      request(testSetup.app.getHttpServer())
        .post('/auth/forgot-password')
        .send({ email: 'alice@example.com' });

    for (let attempt = 0; attempt < 3; attempt++) {
      await forgotPassword().expect(200);
    }

    await forgotPassword().expect(429);
  });
});
