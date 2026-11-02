import { isISBN } from 'class-validator';

const isbn10To13 = (isbn10: string): string => {
  const body = `978${isbn10.slice(0, 9)}`;
  const sum = [...body].reduce(
    (total, digit, index) => total + Number(digit) * (index % 2 === 0 ? 1 : 3),
    0,
  );

  return `${body}${(10 - (sum % 10)) % 10}`;
};

export const normalizeIsbn = (isbn: string): string => {
  const compact = isbn.replace(/[\s-]/g, '').toUpperCase();

  return isISBN(compact, '10') ? isbn10To13(compact) : compact;
};
