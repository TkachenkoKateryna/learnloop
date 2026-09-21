import { api } from '../adapters/api';
import type { Book } from '../types/book';

const basePath = 'books';

export const getBooks = (): Promise<Book[]> => api.get<Book[]>(basePath);

export const deleteItem = (bookId: string) =>
  api.delete(`${basePath}/${bookId}`);
