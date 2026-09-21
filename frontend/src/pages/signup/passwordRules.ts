export const MIN_PASSWORD_LENGTH = 6;

export const hasMinLength = (password: string) =>
  password.length >= MIN_PASSWORD_LENGTH;

export const hasUppercase = (password: string) => /[A-Z]/.test(password);

export const isPasswordValid = (password: string) =>
  hasMinLength(password) && hasUppercase(password);
