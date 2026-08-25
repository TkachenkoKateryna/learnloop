import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { BookLanguage } from '../enums/book-language.enum';
import { Publisher } from 'src/publishers/entities/publisher.entity';

@Entity()
export class Book {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'varchar',
    length: 300,
    nullable: false,
  })
  title: string;

  @Column({ unique: true })
  isbn: string;

  @Column({ type: 'enum', enum: BookLanguage, default: BookLanguage.ENGLISH })
  language: string;

  @Column({ type: 'date' })
  publicationDate: Date;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column()
  publisherId: string;

  @ManyToOne(() => Publisher, (publisher) => publisher.books, {
    nullable: false,
  })
  @JoinColumn({ name: 'publisherId' })
  publisher: Publisher;
}
