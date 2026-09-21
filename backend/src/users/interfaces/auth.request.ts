export interface AuthRequest {
  user: {
    sub: string;
    firstName: string;
    lastName: string;
  };
}
