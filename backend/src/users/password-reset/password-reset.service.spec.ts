import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { createHash } from 'crypto';
import { PasswordResetService } from './password-reset.service';
import { PasswordResetToken } from '../entities/password-reset-token.entity';

const sha256 = (value: string) =>
  createHash('sha256').update(value).digest('hex');

describe('PasswordResetService', () => {
  let service: PasswordResetService;
  let tokens: Map<string, PasswordResetToken>;

  const onlyToken = () => [...tokens.values()][0];

  beforeEach(async () => {
    tokens = new Map();
    let nextId = 1;

    const repository = {
      create: jest.fn(
        (data: Partial<PasswordResetToken>) =>
          ({ usedAt: null, ...data }) as PasswordResetToken,
      ),
      save: jest.fn((token: PasswordResetToken) => {
        const saved = { ...token, id: token.id ?? `token-${nextId++}` };
        tokens.set(saved.id, saved);
        return Promise.resolve(saved);
      }),
      findOneBy: jest.fn(({ tokenHash }: { tokenHash: string }) =>
        Promise.resolve(
          [...tokens.values()].find((t) => t.tokenHash === tokenHash) ?? null,
        ),
      ),
      update: jest.fn((id: string, data: Partial<PasswordResetToken>) => {
        Object.assign(tokens.get(id)!, data);
        return Promise.resolve();
      }),
    };

    const module = await Test.createTestingModule({
      providers: [
        PasswordResetService,
        {
          provide: getRepositoryToken(PasswordResetToken),
          useValue: repository,
        },
        {
          provide: ConfigService,
          useValue: {
            getOrThrow: () => ({ passwordReset: { tokenExpiresIn: '30m' } }),
          },
        },
      ],
    }).compile();

    service = module.get(PasswordResetService);
  });

  describe('createToken', () => {
    it('stores a SHA-256 hash of the token, never the token itself', async () => {
      const token = await service.createToken('user-1');

      expect(onlyToken().tokenHash).toBe(sha256(token));
      expect(onlyToken().tokenHash).not.toBe(token);
      expect(onlyToken().userId).toBe('user-1');
    });

    it('sets an expiry roughly 30 minutes out', async () => {
      const before = Date.now();

      await service.createToken('user-1');

      expect(
        Math.abs(onlyToken().expiresAt.getTime() - (before + 30 * 60 * 1000)),
      ).toBeLessThan(5000);
    });
  });

  describe('consumeToken', () => {
    it('returns the owning user id and marks the token used', async () => {
      const token = await service.createToken('user-1');

      const userId = await service.consumeToken(token);

      expect(userId).toBe('user-1');
      expect(onlyToken().usedAt).not.toBeNull();
    });

    it('rejects an unknown token', async () => {
      await expect(service.consumeToken('not-a-real-token')).resolves.toBe(
        null,
      );
    });

    it('rejects a token that was already used', async () => {
      const token = await service.createToken('user-1');
      await service.consumeToken(token);

      await expect(service.consumeToken(token)).resolves.toBe(null);
    });

    it('rejects an expired token', async () => {
      const token = await service.createToken('user-1');
      onlyToken().expiresAt = new Date(Date.now() - 1000);

      await expect(service.consumeToken(token)).resolves.toBe(null);
    });
  });
});
