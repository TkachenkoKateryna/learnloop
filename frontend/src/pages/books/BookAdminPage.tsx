import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchBooks, removeBook } from '../../store';
import type { AppDispatch, RootState } from '../../store';
import { deleteItem } from '../../services/books';
import BookTable from './components/BookTable';
import styles from './BookAdminPage.module.css';

const BookAdminPage = () => {
  const dispatch = useDispatch<AppDispatch>();
  const {
    items: books,
    status,
    error,
  } = useSelector((state: RootState) => state.books);

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
