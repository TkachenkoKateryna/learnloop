export interface Book {
  id: string;
  title: string;
  isbn: string;
  language: string;
  publicationDate: string;
  description: string | null;
  publisherId: string;
}
