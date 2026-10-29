import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  NotFoundException,
  ParseUUIDPipe,
} from '@nestjs/common';
import { BooksService } from './books.service';
import { CreateBookDto } from './dto/create-book.dto';
import { UpdateBookDto } from './dto/update-book.dto';
import { Book } from './entities/book.entity';
import { RequirePermissions } from '../authorization/permissions.decorator';
import { Permissions } from '../authorization/permissions';

@Controller('books')
export class BooksController {
  constructor(private readonly booksService: BooksService) {}

  @RequirePermissions(Permissions.Books.Read)
  @Get()
  public async findAll(): Promise<Book[]> {
    return this.booksService.findAll();
  }

  @RequirePermissions(Permissions.Books.Read)
  @Get(':id')
  public async findOne(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<Book | null> {
    return this.booksService.findOne(id);
  }

  @RequirePermissions(Permissions.Books.Create)
  @Post()
  create(@Body() createBookDto: CreateBookDto) {
    return this.booksService.create(createBookDto);
  }

  @RequirePermissions(Permissions.Books.Update)
  @Patch(':id')
  public async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateBookDto: UpdateBookDto,
  ) {
    const book = await this.findOneOrFail(id);

    return this.booksService.update(book, updateBookDto);
  }

  @RequirePermissions(Permissions.Books.Delete)
  @Delete(':id')
  public async remove(@Param('id', ParseUUIDPipe) id: string) {
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
