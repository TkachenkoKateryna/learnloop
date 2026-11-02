import {
  Check,
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { BookLanguage } from '../enums/book-language.enum';
import { Publisher } from '../../publishers/entities/publisher.entity';
import { checkName, sqlInList } from '../../database/sql';

const ISBN_NORMALIZED = `"isbn" ~ '^[0-9]{13}$'`;
const LANGUAGE_ALLOWED = `"language" IN (${sqlInList(Object.values(BookLanguage))})`;

export const BOOK_ISBN_UNIQUE = 'uq_books_isbn';
export const BOOK_ISBN_NORMALIZED_CHECK = checkName(
  'chk_books_isbn_normalized',
  ISBN_NORMALIZED,
);
export const BOOK_PUBLISHER_FK = 'fk_books_publisher_id';
export const BOOK_LANGUAGE_CHECK = checkName(
  'chk_books_language',
  LANGUAGE_ALLOWED,
);

@Entity('books')
@Index(BOOK_ISBN_UNIQUE, ['isbn'], { unique: true })
@Check(BOOK_ISBN_NORMALIZED_CHECK, ISBN_NORMALIZED)
@Check(BOOK_LANGUAGE_CHECK, LANGUAGE_ALLOWED)
export class Book {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'varchar',
    length: 300,
    nullable: false,
  })
  title: string;

  @Column()
  isbn: string;

  @Column({ type: 'varchar', length: 10, default: BookLanguage.ENGLISH })
  language: BookLanguage;

  @Column({ type: 'date' })
  publicationDate: Date;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Index()
  @Column()
  publisherId: string;

  @ManyToOne(() => Publisher, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({
    name: 'publisher_id',
    foreignKeyConstraintName: BOOK_PUBLISHER_FK,
  })
  publisher: Publisher;
}
