import { useState } from 'react';
import { getErrorMessage } from '../utils/getErrorMessage';

export const useAsyncAction = <Args extends unknown[]>(
  action: (...args: Args) => Promise<unknown>,
  fallbackError: string,
) => {
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async (...args: Args): Promise<boolean> => {
    setIsPending(true);
    setError(null);

    try {
      await action(...args);
      return true;
    } catch (caught) {
      setError(
        typeof caught === 'string'
          ? caught
          : getErrorMessage(caught, fallbackError),
      );
      return false;
    } finally {
      setIsPending(false);
    }
  };

  return { run, isPending, error };
};
