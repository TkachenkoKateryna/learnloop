import { Expose } from 'class-transformer';

export class LoginResponse {
  @Expose()
  accessToken: string;

  constructor(accessToken: string) {
    this.accessToken = accessToken;
  }
}
