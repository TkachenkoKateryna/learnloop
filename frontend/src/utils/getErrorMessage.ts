import axios from 'axios';

export const getErrorMessage = (error: unknown, fallback: string): string => {
  if (!axios.isAxiosError(error)) {
    return fallback;
  }

  if (!error.response) {
    return 'Unable to reach the server. Please try again.';
  }

  const message: unknown = error.response.data?.message;

  if (Array.isArray(message)) {
    return message.join(', ');
  }

  return typeof message === 'string' ? message : fallback;
};
