import { useEffect, useState } from "react";
import { Routes, Route, Link } from "react-router-dom";
import Navbar from "./components/Navbar";
import Login from "./pages/Login";
import Register from "./pages/Register";
import { BookDetailPage } from "./pages/BookDetail";
import "./App.css";

const API_URL = (
  import.meta.env.VITE_API_URL || "http://localhost:5000/api"
).replace(/\/$/, "");

function Catalog() {
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

const [filters, setFilters] = useState({
  titlu: "",
  autor: "",
  limba: "",
  editura: "",
  gen: "",
  minPret: "",
  maxPret: "",
  stoc: false
});

  const [languages, setLanguages] = useState([]);
  const [publishers, setPublishers] = useState([]);
  const [genres, setGenres] = useState([]);

  const loadBooks = async (currentFilters = filters) => {
    try {
      setLoading(true);
      setError("");
      const params = new URLSearchParams();

      Object.entries(currentFilters).forEach(([key, value]) => {
        if (value !== "" && value !== false) {
          params.append(key, value);
        }
      });

      const response = await fetch(`${API_URL}/books?${params.toString()}`);
      if (!response.ok) throw new Error("Could not load books.");

      const data = await response.json();
      setBooks(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadFilterOptions = async () => {
    try {
      const response = await fetch(`${API_URL}/books/filters`);
      if (!response.ok) throw new Error("Could not load filter options.");
      const data = await response.json();
      setLanguages(data.languages || []);
      setPublishers(data.publishers || []);
      setGenres(data.genres || []);
    } catch (err) {
      console.error(err.message);
    }
  };

  useEffect(() => {
    loadBooks();
    loadFilterOptions();
  }, []);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFilters((previousFilters) => ({
      ...previousFilters,
      [name]: type === "checkbox" ? checked : value
    }));
  };

const handleFilter = () => {
  loadBooks({
    ...filters,
    titlu: filters.titlu.trim(),
    autor: filters.autor.trim(),
    limba: filters.limba.trim(),
    editura: filters.editura.trim(),
    gen: filters.gen.trim()
  });
};

const handleReset = () => {
  const emptyFilters = {
    titlu: "",
    autor: "",
    limba: "",
    editura: "",
    gen: "",
    minPret: "",
    maxPret: "",
    stoc: false
  };
  setFilters(emptyFilters);
  loadBooks(emptyFilters);
};

  return (
    <main className="main">
      <section className="catalog">
        <div className="filters">
          <h3>Filter books</h3>
          <div className="filter-grid">
            <input
              type="text"
              name="titlu"
              placeholder="Search by title..."
              value={filters.titlu}
              onChange={handleChange}
            />
            <input
              type="text"
              name="autor"
              placeholder="Search by author..."
              value={filters.autor}
              onChange={handleChange}
            />
            <select name="limba" value={filters.limba} onChange={handleChange}>
              <option value="">All languages</option>
              {languages.map((language) => (
                <option key={language} value={language}>{language}</option>
              ))}
            </select>
            <select name="editura" value={filters.editura} onChange={handleChange}>
              <option value="">All publishers</option>
              {publishers.map((publisher) => (
                <option key={publisher} value={publisher}>{publisher}</option>
              ))}
            </select>
            <select name="gen" value={filters.gen} onChange={handleChange}>
              <option value="">All genres</option>
              {genres.map((genre) => (
                <option key={genre} value={genre}>{genre}</option>
              ))}
            </select>
            <input
              type="number"
              name="maxPret"
              placeholder="Maximum price"
              min="0"
              value={filters.maxPret}
              onChange={handleChange}
            />
          </div>

          <label className="stock-filter">
            <input
              type="checkbox"
              name="stoc"
              checked={filters.stoc}
              onChange={handleChange}
            />
            Only books in stock
          </label>

          <div className="filter-buttons">
            <button onClick={handleFilter}>Apply filters</button>
            <button className="reset-button" onClick={handleReset}>Reset</button>
          </div>
        </div>

        {!loading && <div className="results-count">{books.length} books found</div>}
        {loading && <p>Loading...</p>}
        {error && <p className="error">{error}</p>}

        {!loading && !error && books.length === 0 && (
          <div className="empty">
            <h3>No book</h3>
            <p>Didn't find any books matching the filters.</p>
          </div>
        )}

        {!loading && !error && books.length > 0 && (
          <div className="book-grid">
            {books.map((book) => {
              const authorNames = book.autori && book.autori.length > 0 
                ? book.autori.map(a => a.nume).join(", ") 
                : "Unknown Author";

              const genreNames = book.genuri && book.genuri.length > 0
                ? book.genuri.map(g => g.denumire).join(", ")
                : "";

              return (
                <article className="book-card" key={book.codcar}>
                  <div className="book-cover"></div>
                  <div className="book-info">
                    <h3>{book.titlu}</h3>
                    <p className="publisher">
                      <strong>{authorNames}</strong>
                      <br />
                      {book.editura} · {book.limba}
                      {genreNames && (
                        <>
                          <br />
                          <span style={{ color: '#0284c7', fontSize: '12px', fontWeight: '500' }}>
                            Genres: {genreNames}
                          </span>
                        </>
                      )}
                    </p>
                    <Link className="details-btn" to={`/book/${book.codcar}`}>
                      See more
                    </Link>
                    <div className="book-bottom">
                      <strong>{Number(book.pret).toFixed(2)} lei</strong>
                      <span>{book.stoc > 0 ? `${book.stoc} in stock` : "Out of stock"}</span>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}

function App() {
  return (
    <div className="app">
      <Navbar />

      <Routes>
        <Route
          path="/"
          element={
            <>
              <section className="hero">
                <div className="hero-content">
                  <h1>Our bookstore</h1>
                  <p>Your experience matters</p>
                  <a href="#catalog" className="hero-button">
                    Explore the catalog
                  </a>
                </div>
              </section>

              <div id="catalog">
                <Catalog />
              </div>
            </>
          }
        />

        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/book/:id" element={<BookDetailPage />} />
      </Routes>
    </div>
  );
}

export default App;