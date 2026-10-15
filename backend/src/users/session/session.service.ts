import { Injectable } from '@nestjs/common';
import { Session } from '../entities/session.entity';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';

@Injectable()
export class SessionService {
  constructor(
    @InjectRepository(Session)
    private readonly sessionRepository: Repository<Session>,
  ) {}

  async get(sessionId: string): Promise<Session | null> {
    return this.sessionRepository.findOneBy({
      id: sessionId,
    });
  }

  async create(
    data: Pick<
      Session,
      'userId' | 'refreshTokenHash' | 'expiresAt' | 'rememberMe'
    > &
      Partial<Pick<Session, 'id'>>,
  ) {
    const session = this.sessionRepository.create(data);
    return this.sessionRepository.save(session);
  }

  async rotateRefreshToken(
    id: string,
    data: Pick<Session, 'refreshTokenHash' | 'expiresAt'>,
  ): Promise<void> {
    await this.sessionRepository.update(id, data);
  }

  async revoke(id: string): Promise<void> {
    await this.sessionRepository.update(id, { revokedAt: new Date() });
  }

  async revokeAllForUser(userId: string): Promise<void> {
    await this.sessionRepository.update({ userId }, { revokedAt: new Date() });
  }
}
