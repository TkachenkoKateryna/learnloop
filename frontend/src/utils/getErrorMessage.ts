import axios from 'axios';
import { getRetryAfterSeconds } from './getRetryAfterSeconds';

const formatWait = (seconds: number): string => {
  if (seconds < 60) {
    return seconds === 1 ? '1 second' : `${seconds} seconds`;
  }

  const minutes = Math.ceil(seconds / 60);
  return minutes === 1 ? '1 minute' : `${minutes} minutes`;
};

export const getErrorMessage = (error: unknown, fallback: string): string => {
  if (!axios.isAxiosError(error)) {
    return fallback;
  }

  if (!error.response) {
    return 'Unable to reach the server. Please try again.';
  }

  if (error.response.status === 429) {
    const seconds = getRetryAfterSeconds(error);

    return seconds
      ? `Too many requests. Please try again in ${formatWait(seconds)}.`
      : 'Too many requests. Please wait a moment and try again.';
  }

  if (error.response.status === 403) {
    return "This action isn't available for your account.";
  }

  const message: unknown = error.response.data?.message;

  if (Array.isArray(message)) {
    return message.join(', ');
  }

  return typeof message === 'string' ? message : fallback;
};
