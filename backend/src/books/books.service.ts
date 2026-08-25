import { Injectable } from '@nestjs/common';
import { CreateBookDto } from './dto/create-book.dto';
import { UpdateBookDto } from './dto/update-book.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Book } from './entities/book.entity';
import { Repository } from 'typeorm';

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
    return await this.booksRepositry.save(createBookDto);
  }

  public async update(book: Book, updateBookDto: UpdateBookDto): Promise<Book> {
    Object.assign(book, updateBookDto);

    return await this.booksRepositry.save(book);
  }

  public async delete(book: Book): Promise<void> {
    await this.booksRepositry.delete(book.id);
  }
}
