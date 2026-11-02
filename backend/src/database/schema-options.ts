import { SnakeNamingStrategy } from './snake-naming.strategy';

export const schemaOptions = {
  namingStrategy: new SnakeNamingStrategy(),
  uuidExtension: 'pgcrypto',
  installExtensions: false,
} as const;
