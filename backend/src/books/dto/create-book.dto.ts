import {
  IsDateString,
  IsEnum,
  IsISBN,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';
import { BookLanguage } from '../enums/book-language.enum';

export class CreateBookDto {
  @IsNotEmpty()
  @IsString()
  @MaxLength(300)
  title: string;

  @IsNotEmpty()
  @IsISBN()
  isbn: string;

  @IsNotEmpty()
  @IsEnum(BookLanguage)
  language: BookLanguage;

  @IsNotEmpty()
  @IsDateString()
  publicationDate: string;

  @IsOptional()
  @IsString()
  description: string;

  @IsNotEmpty()
  @IsUUID()
  publisherId: string;
}
