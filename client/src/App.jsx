import { useEffect, useState } from "react";
import { Routes, Route, Link } from "react-router-dom";
import Navbar from "./components/Navbar";
import Login from "./pages/Login";
import Register from "./pages/Register";
import { BookDetailPage } from "./pages/BookDetail";
import Authors from "./pages/Authors";
import "./App.css";
import defaultCover from "./assets/book-cover.jpg";
import { useAuth } from "./context/AuthContext";
import Cart from "./pages/Cart";
import MyAccount from "./pages/MyAccount";
import AdminPanel from "./pages/AdminPanel";
import AdminReports from "./pages/AdminReports";
import { VirtualShelfPage } from './pages/VirtualShelf';

const API_URL = (
  import.meta.env.VITE_API_URL || "http://localhost:5000/api"
).replace(/\/$/, "");

function Catalog() {
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const { user } = useAuth();

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

const [cartIds, setCartIds] = useState([]);
const [savedIds, setSavedIds] = useState([]);

useEffect(() => {
  if (!user || user.role !== "client") {
    setCartIds([]);
    setSavedIds([]);
    return;
  }

  const loadUserLists = async () => {
    try {
      const [cartRes, savedRes] = await Promise.all([
        fetch(`${API_URL}/cart`, { credentials: "include" }),
        fetch(`${API_URL}/saved/ids`, { credentials: "include" })
      ]);

      if (cartRes.ok) {
        const cartData = await cartRes.json();
        setCartIds(cartData.map((item) => Number(item.codcar)));
      }

      if (savedRes.ok) {
        const savedData = await savedRes.json();
        setSavedIds(savedData.map((id) => Number(id)));
      }
    } catch (err) {
      console.error("Error loading cart/saved state:", err);
    }
  };

  loadUserLists();
}, [user]);

const handleToggleCart = async (codcar, stoc) => {
  const numericId = Number(codcar);
  const isInCart = cartIds.includes(numericId);

  if (!isInCart && stoc <= 0) return;

  try {
    if (isInCart) {
      const res = await fetch(`${API_URL}/cart/${numericId}`, {
        method: "DELETE",
        credentials: "include"
      });
      if (!res.ok) throw new Error("Failed to remove from cart");
      setCartIds((prev) => prev.filter((id) => id !== numericId));
    } else {
      const res = await fetch(`${API_URL}/cart`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ codcar: numericId, nr_ex: 1 }),
        credentials: "include"
      });
      if (!res.ok) throw new Error("Failed to add to cart");
      setCartIds((prev) => [...prev, numericId]);
    }
  } catch (err) {
    alert(err.message);
  }
};

const handleToggleSave = async (codcar) => {
  const numericId = Number(codcar);
  const isSaved = savedIds.includes(numericId);

  try {
    if (isSaved) {
      const res = await fetch(`${API_URL}/saved/${numericId}`, {
        method: "DELETE",
        credentials: "include"
      });
      if (!res.ok) throw new Error("Failed to unsave book");
      setSavedIds((prev) => prev.filter((id) => id !== numericId));
    } else {
      const res = await fetch(`${API_URL}/saved`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ codcar: numericId }),
        credentials: "include"
      });
      if (!res.ok) throw new Error("Failed to save book");
      setSavedIds((prev) => [...prev, numericId]);
    }
  } catch (err) {
    alert(err.message);
  }
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
                <article
                  key={book.codcar}
                  style={{
                    background: "#ffffff",
                    border: "1px solid #e2e8f0",
                    borderRadius: "10px",
                    overflow: "hidden",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    boxShadow: "0 2px 8px rgba(0, 0, 0, 0.04)",
                    width: "100%",
                    maxWidth: "340px"
                  }}
                >
                  <div>
                    <div style={{ height: "200px", overflow: "hidden", background: "#efe3fc" }}>
                      <img
                        src={defaultCover}
                        alt={book.titlu}
                        style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "top" }}
                      />
                    </div>

                    <div style={{ padding: "18px" }}>
                      <h3 style={{ margin: "0 0 6px", fontFamily: "Georgia, serif", fontSize: "19px", color: "#0f172a", lineHeight: "1.3" }}>
                        {book.titlu}
                      </h3>
                      <p style={{ margin: "0 0 8px", fontSize: "13px", color: "#475569", fontWeight: "600" }}>
                        {authorNames}
                      </p>
                      <p style={{ margin: 0, fontSize: "12px", color: "#64748b", lineHeight: "1.5" }}>
                        {book.editura} · {book.limba}
                        {genreNames && (
                          <>
                            <br />
                            <span style={{ color: '#0284c7', fontWeight: '500' }}>
                              Genres: {genreNames}
                            </span>
                          </>
                        )}
 
                      </p>
                      <div style={{ marginTop: "8px", display: "flex", alignItems: "center", gap: "6px", fontSize: "13px" }}>
                          <span style={{ color: "#f59e0b", fontWeight: "700" }}>
                            ★ {book.rating_count > 0 ? Number(book.avg_rating).toFixed(1) : "—"}
                          </span>
                          <span style={{ color: "#64748b", fontSize: "12px" }}>
                            ({book.rating_count || 0} {book.rating_count === 1 ? "rating" : "ratings"})
                          </span>
                        </div>
                    </div>
                  </div>

                  <div style={{ padding: "0 18px 18px 18px" }}>
                    <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "14px" }}>
                      <Link
                        to={`/book/${book.codcar}`}
                        className="details-btn"
                        style={{ display: "inline-block", padding: "6px 12px", fontSize: "13px", textDecoration: "none" }}
                      >
                        See more
                      </Link>

                      {user?.role === "client" && (() => {
                        const inCart = cartIds.includes(Number(book.codcar));
                        const isSaved = savedIds.includes(Number(book.codcar));

                        return (
                          <div style={{ display: "flex", gap: "6px" }}>
                            <button
                              type="button"
                              title={
                                inCart
                                  ? "Remove from cart"
                                  : book.stoc > 0
                                  ? "Add to cart"
                                  : "Out of stock"
                              }
                              disabled={!inCart && book.stoc <= 0}
                              onClick={() => handleToggleCart(book.codcar, book.stoc)}
                              style={{
                                background: inCart ? "#059669" : book.stoc > 0 ? "#2563eb" : "#94a3b8",
                                color: "#ffffff",
                                border: "none",
                                borderRadius: "6px",
                                width: "36px",
                                height: "36px",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                cursor: !inCart && book.stoc <= 0 ? "not-allowed" : "pointer"
                              }}
                            >
                              {inCart ? (
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                                  <polyline points="20 6 9 17 4 12"></polyline>
                                </svg>
                              ) : (
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path>
                                  <line x1="3" y1="6" x2="21" y2="6"></line>
                                  <path d="M16 10a4 4 0 0 1-8 0"></path>
                                </svg>
                              )}
                            </button>

                            <button
                              type="button"
                              title={isSaved ? "Remove from saved" : "Save"}
                              onClick={() => handleToggleSave(book.codcar)}
                              style={{
                                background: isSaved ? "#fef3c7" : "#f1f5f9",
                                color: isSaved ? "#b45309" : "#475569",
                                border: isSaved ? "1px solid #f59e0b" : "1px solid #cbd5e1",
                                borderRadius: "6px",
                                width: "36px",
                                height: "36px",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                cursor: "pointer"
                              }}
                            >
                              <svg
                                width="16"
                                height="16"
                                viewBox="0 0 24 24"
                                fill={isSaved ? "currentColor" : "none"}
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              >
                                <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path>
                              </svg>
                            </button>
                          </div>
                        );
                      })()}
                    </div>

                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid #f1f5f9", paddingTop: "12px" }}>
                      <strong style={{ fontSize: "16px", color: "#0f172a" }}>
                        {Number(book.pret).toFixed(2)} lei
                      </strong>
                      <span style={{ color: book.stoc > 0 ? "#059669" : "#dc2626", fontWeight: "600", fontSize: "12px" }}>
                        {book.stoc > 0 ? `${book.stoc} in stock` : "Out of stock"}
                      </span>
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
                  <br></br>
                  <a href="/shelf" className="hero-button">
                    Try our virtual shelf tour
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
        <Route path="/autori" element={<Authors />} />
        <Route path="/register" element={<Register />} />
        <Route path="/book/:id" element={<BookDetailPage />} />
        <Route path="/cart" element={<Cart />} />
        <Route path="/my-account" element={<MyAccount />} />
        <Route path="/admin" element={<AdminPanel />} />
        <Route path="/admin/reports" element={<AdminReports />} />
        <Route path="/shelf" element={<VirtualShelfPage />} />
      </Routes>
    </div>
  );
}

export default App;