import { Test, TestingModule } from '@nestjs/testing';
import * as bcrypt from 'bcrypt';
import { PasswordService } from './password.service';

jest.mock('bcrypt');

describe('PasswordService', () => {
  let service: PasswordService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PasswordService],
    }).compile();

    service = module.get<PasswordService>(PasswordService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('hash', () => {
    it('delegates to bcrypt.hash with the password and configured salt rounds', async () => {
      const hashSpy = jest
        .spyOn(bcrypt, 'hash')
        .mockResolvedValue('hashed-value' as never);

      const result = await service.hash('plainPassword');

      expect(hashSpy).toHaveBeenCalledWith('plainPassword', 10);
      expect(result).toBe('hashed-value');
    });
  });

  describe('verify', () => {
    it.each([true, false])(
      'delegates to bcrypt.compare and returns %s',
      async (comparisonResult) => {
        const compareSpy = jest
          .spyOn(bcrypt, 'compare')
          .mockResolvedValue(comparisonResult as never);

        const result = await service.verify('plainPassword', 'hashedPassword');

        expect(compareSpy).toHaveBeenCalledWith(
          'plainPassword',
          'hashedPassword',
        );
        expect(result).toBe(comparisonResult);
      },
    );
  });
});
