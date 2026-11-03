import { BadRequestException, ConflictException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BooksService } from './books.service';
import { CreateBookDto } from './dto/create-book.dto';
import {
  Book,
  BOOK_ISBN_UNIQUE,
  BOOK_PUBLISHER_FK,
} from './entities/book.entity';
import { BookLanguage } from './enums/book-language.enum';
import { postgresQueryError } from '../database/postgres-errors.testing';

describe('BooksService', () => {
  let service: BooksService;
  let booksRepository: { save: jest.Mock<Promise<Book>, [Partial<Book>]> };

  const newBook: CreateBookDto = {
    title: 'New Book',
    isbn: '9781861972712',
    language: BookLanguage.ENGLISH,
    publicationDate: '2020-01-01',
    description: 'A book',
    publisherId: 'publisher-1',
  };

  beforeEach(async () => {
    booksRepository = {
      save: jest.fn((book: Partial<Book>) =>
        Promise.resolve({ ...book, id: 'book-1' } as Book),
      ),
    };

    const module = await Test.createTestingModule({
      providers: [
        BooksService,
        { provide: getRepositoryToken(Book), useValue: booksRepository },
      ],
    }).compile();

    service = module.get(BooksService);
  });

  it('creates a book', async () => {
    await expect(service.create(newBook)).resolves.toMatchObject({
      id: 'book-1',
      isbn: newBook.isbn,
    });
  });

  const isbnTaken = postgresQueryError({
    code: '23505',
    constraint: BOOK_ISBN_UNIQUE,
  });

  it('reports a taken ISBN as a conflict', async () => {
    booksRepository.save.mockRejectedValue(isbnTaken);

    await expect(service.create(newBook)).rejects.toThrow(ConflictException);
  });

  it('reports a publisher that does not exist as a bad request', async () => {
    booksRepository.save.mockRejectedValue(
      postgresQueryError({ code: '23503', constraint: BOOK_PUBLISHER_FK }),
    );

    await expect(service.create(newBook)).rejects.toThrow(BadRequestException);
  });

  it('maps the same errors on update', async () => {
    booksRepository.save.mockRejectedValue(isbnTaken);

    await expect(
      service.update({ id: 'book-1' } as Book, { isbn: newBook.isbn }),
    ).rejects.toThrow(ConflictException);
  });

  it('lets other database errors through', async () => {
    const otherError = postgresQueryError({
      code: '23505',
      constraint: 'uq_other',
    });
    booksRepository.save.mockRejectedValue(otherError);

    await expect(service.create(newBook)).rejects.toBe(otherError);
  });
});
