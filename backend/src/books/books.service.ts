import {
  BadRequestException,
  ConflictException,
  Injectable,
} from '@nestjs/common';
import { CreateBookDto } from './dto/create-book.dto';
import { UpdateBookDto } from './dto/update-book.dto';
import { InjectRepository } from '@nestjs/typeorm';
import {
  Book,
  BOOK_ISBN_UNIQUE,
  BOOK_PUBLISHER_FK,
} from './entities/book.entity';
import { DeepPartial, Repository } from 'typeorm';
import {
  isPostgresError,
  PostgresErrorCode,
} from '../database/postgres-errors';

@Injectable()
export class BooksService {
  constructor(
    @InjectRepository(Book) private readonly booksRepositry: Repository<Book>,
  ) {}

  async findAll(): Promise<Book[]> {
    return await this.booksRepositry.find();
  }

  async findOne(id: string): Promise<Book | null> {
    return await this.booksRepositry.findOneBy({ id });
  }

  public async create(createBookDto: CreateBookDto): Promise<Book> {
    return await this.save(createBookDto);
  }

  public async update(book: Book, updateBookDto: UpdateBookDto): Promise<Book> {
    Object.assign(book, updateBookDto);

    return await this.save(book);
  }

  public async delete(book: Book): Promise<void> {
    await this.booksRepositry.delete(book.id);
  }

  private async save(book: DeepPartial<Book>): Promise<Book> {
    try {
      return await this.booksRepositry.save(book);
    } catch (error) {
      if (
        isPostgresError(
          error,
          PostgresErrorCode.UniqueViolation,
          BOOK_ISBN_UNIQUE,
        )
      ) {
        throw new ConflictException('A book with this ISBN already exists');
      }
      if (
        isPostgresError(
          error,
          PostgresErrorCode.ForeignKeyViolation,
          BOOK_PUBLISHER_FK,
        )
      ) {
        throw new BadRequestException('Publisher does not exist');
      }
      throw error;
    }
  }
}
