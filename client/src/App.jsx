import { useEffect, useState } from "react";
import { Routes, Route } from "react-router-dom";
import { Link } from "react-router-dom";
import Navbar from "./components/Navbar";
import Login from "./pages/Login";
import Register from "./pages/Register";
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
    limba: "",
    editura: "",
    minPret: "",
    maxPret: "",
    stoc: false
  });

  const [languages, setLanguages] = useState([]);
  const [publishers, setPublishers] = useState([]);

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
      limba: filters.limba.trim(),
      editura: filters.editura.trim()
    });
  };

  const handleReset = () => {
    const emptyFilters = {
      titlu: "",
      limba: "",
      editura: "",
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
            {books.map((book) => (
              <article className="book-card" key={book.codcar}>
                <div className="book-cover"></div>
                <div className="book-info">
                  <h3>{book.titlu}</h3>
                  <p className="publisher">{book.editura} · {book.limba}</p>
                  <p className="description">{book.descriere || "Descoperă această carte"}</p>
                  <div className="book-bottom">
                    <strong>{Number(book.pret).toFixed(2)} lei</strong>
                    <span>{book.stoc > 0 ? `${book.stoc} in stock` : "Out of stock"}</span>
                  </div>
                </div>
              </article>
            ))}
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
      </Routes>
    </div>
  );
}

export default App;