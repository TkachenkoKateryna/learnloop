export interface JWTPayload {
  sub: string;
  sid: string;
}

export interface AccessTokenPayload extends JWTPayload {
  firstName: string;
  lastName: string;
}
