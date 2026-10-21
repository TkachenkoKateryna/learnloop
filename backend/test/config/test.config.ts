export const testConfig = {
  database: {
    type: 'postgres',
    host: 'localhost',
    port: 5433,
    username: 'postgres',
    password: 'postgres',
    database: 'learnloop_e2e',
    synchronize: 1,
  },
  auth: {
    jwt: {
      accessTokenSecret: 'access-secret-123',
      accessTokenExpiresIn: '1m',
      refreshTokenSecret: 'refresh-secret-123',
      refreshTokenExpiresIn: '1d',
      refreshTokenRememberMeExpiresIn: '30d',
    },
    passwordReset: {
      tokenExpiresIn: '30m',
      resetUrl: 'http://localhost:5173/reset-password',
    },
  },
  // MailService is replaced with a mock in TestSetup; this only satisfies
  // the config lookup so nothing reaches SendGrid.
  mail: {
    sendgridApiKey: 'test-key',
    fromEmail: 'no-reply@example.com',
    fromName: 'LearnLoop Test',
  },
  throttle: {
    ttl: 60_000,
    limit: 60,
    skip: true,
  },
};
