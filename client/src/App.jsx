import { useEffect, useState } from "react";
import { Routes, Route } from "react-router-dom";
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
          <h3>Filtrează cărțile</h3>
          <div className="filter-grid">
            <input
              type="text"
              name="titlu"
              placeholder="Caută după titlu..."
              value={filters.titlu}
              onChange={handleChange}
            />
            <select name="limba" value={filters.limba} onChange={handleChange}>
              <option value="">Toate limbile</option>
              {languages.map((language) => (
                <option key={language} value={language}>{language}</option>
              ))}
            </select>
            <select name="editura" value={filters.editura} onChange={handleChange}>
              <option value="">Toate editurile</option>
              {publishers.map((publisher) => (
                <option key={publisher} value={publisher}>{publisher}</option>
              ))}
            </select>
            <input
              type="number"
              name="maxPret"
              placeholder="Preț maxim"
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
            Doar cărțile aflate în stoc
          </label>

          <div className="filter-buttons">
            <button onClick={handleFilter}>Aplică filtrele</button>
            <button className="reset-button" onClick={handleReset}>Resetează</button>
          </div>
        </div>

        {!loading && <div className="results-count">{books.length} cărți găsite</div>}
        {loading && <p>Se încarcă...</p>}
        {error && <p className="error">{error}</p>}

        {!loading && !error && books.length === 0 && (
          <div className="empty">
            <h3>Nu există cărți</h3>
            <p>Nu am găsit cărți care să corespundă filtrelor.</p>
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
                    <span>{book.stoc > 0 ? `${book.stoc} în stoc` : "Stoc epuizat"}</span>
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
        <Route path="/" element={<Catalog />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
      </Routes>
    </div>
  );
}

export default App;