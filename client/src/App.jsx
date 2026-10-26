
import { useEffect, useState } from "react";
import "./App.css";

const API_URL = (
  import.meta.env.VITE_API_URL || "http://localhost:5000/api"
).replace(/\/$/, "");

function App() {
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadBooks() {
      try {
        const response = await fetch(`${API_URL}/books`);

        if (!response.ok) {
          throw new Error("Could not load books.");
        }

        const data = await response.json();
        setBooks(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    loadBooks();
  }, []);

  return (
    <div className="app">
      <header className="header">
        <a className="logo" href="/">
          Librărie
        </a>

        <nav>
          <a href="/">Cărți</a>
        </nav>
      </header>

      <main className="main">

        <section className="catalog">
          <div className="section-heading">
            <div>
              <h2>Cărțile noastre</h2>
              
            </div>

            <span>{books.length} cărți</span>
          </div>

          {loading && <p>Se încarcă...</p>}

          {error && <p className="error">{error}</p>}

          {!loading && !error && books.length === 0 && (
            <div className="empty">
              <h3>No books yet</h3>
              <p>
                Your API is working, but the carte table has no books.
              </p>
            </div>
          )}

          {!loading && !error && books.length > 0 && (
            <div className="book-grid">
              {books.map((book) => (
                <article className="book-card" key={book.codcar}>
                  <div className="book-cover">
                    
                  </div>

                  <div className="book-info">
                    <h3>{book.titlu}</h3>

                    <p className="publisher">
                      {book.editura} · {book.limba}
                    </p>

                    <p className="description">
                      {book.descriere || "Descoperă această carte"}
                    </p>

                    <div className="book-bottom">
                      <strong>
                        {Number(book.pret).toFixed(2)} lei
                      </strong>

                      <span>
                        {book.stoc > 0
                          ? `${book.stoc} în stoc`
                          : "Stoc epuizat"}
                      </span>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

export default App;
