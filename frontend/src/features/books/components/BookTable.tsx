import type { Book } from '../types/book';
import styles from './BookTable.module.css';

interface BookTableProps {
  books: Book[];
  onDelete: (bookId: string) => void;
}

const BookTable = ({ books, onDelete }: BookTableProps) => {
  if (books.length === 0) {
    return <p className={styles.empty}>No books found.</p>;
  }

  return (
    <table className={styles.table}>
      <thead>
        <tr>
          <th className={styles.headerCell}>Title</th>
          <th className={styles.headerCell}>ISBN</th>
          <th className={styles.headerCell}>Language</th>
          <th className={styles.headerCell}>Published</th>
          <th className={styles.headerCell} aria-label="Actions" />
        </tr>
      </thead>
      <tbody>
        {books.map((book) => (
          <tr key={book.id} className={styles.row}>
            <td className={styles.cell}>{book.title}</td>
            <td className={styles.cell}>{book.isbn}</td>
            <td className={styles.cell}>{book.language.toUpperCase()}</td>
            <td className={styles.cell}>
              {new Date(book.publicationDate).toLocaleDateString()}
            </td>
            <td className={styles.cell}>
              <button
                type="button"
                className={styles.deleteButton}
                onClick={() => onDelete(book.id)}
              >
                Delete
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};

export default BookTable;
