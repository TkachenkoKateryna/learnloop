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
  },
};
