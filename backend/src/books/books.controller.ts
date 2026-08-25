import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  NotFoundException,
} from '@nestjs/common';
import { BooksService } from './books.service';
import { CreateBookDto } from './dto/create-book.dto';
import { UpdateBookDto } from './dto/update-book.dto';
import { Book } from './entities/book.entity';

@Controller('books')
export class BooksController {
  constructor(private readonly booksService: BooksService) {}

  @Get()
  public async findAll(): Promise<Book[]> {
    return this.booksService.findAll();
  }

  @Get(':id')
  public async findOne(@Param('id') id: string): Promise<Book | null> {
    return this.booksService.findOne(id);
  }

  @Post()
  create(@Body() createBookDto: CreateBookDto) {
    return this.booksService.create(createBookDto);
  }

  @Patch(':id')
  public async update(
    @Param('id') id: string,
    @Body() updateBookDto: UpdateBookDto,
  ) {
    const book = await this.findOneOrFail(id);

    return this.booksService.update(book, updateBookDto);
  }

  @Delete(':id')
  public async remove(@Param('id') id: string) {
    const book = await this.findOneOrFail(id);
    await this.booksService.delete(book);
  }

  private async findOneOrFail(id: string): Promise<Book> {
    const book = await this.booksService.findOne(id);

    if (!book) {
      throw new NotFoundException();
    }

    return book;
  }
}
