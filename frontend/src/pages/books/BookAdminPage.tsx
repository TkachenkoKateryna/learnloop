import { useEffect } from 'react';
import {
  BookTable,
  deleteItem,
  fetchBooks,
  removeBook,
} from '../../features/books';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import styles from './BookAdminPage.module.css';

const BookAdminPage = () => {
  const dispatch = useAppDispatch();
  const {
    items: books,
    status,
    error,
  } = useAppSelector((state) => state.books);

  useEffect(() => {
    dispatch(fetchBooks());
  }, [dispatch]);

  const handleDelete = async (bookId: string) => {
    await deleteItem(bookId);
    dispatch(removeBook(bookId));
  };

  return (
    <div className={styles.page}>
      <h2 className={styles.title}>Books</h2>
      {status === 'loading' && (
        <p className={styles.status}>Loading books...</p>
      )}
      {status === 'failed' && <p className={styles.error}>{error}</p>}
      {status === 'succeeded' && (
        <BookTable books={books} onDelete={handleDelete} />
      )}
    </div>
  );
};

export default BookAdminPage;
