import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

const API_URL = (
  import.meta.env.VITE_API_URL || "http://localhost:5000/api"
).replace(/\/$/, "");

export default function Authors() {
  const [authors, setAuthors] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchAuthors = async (searchTerm = "") => {
    try {
      setLoading(true);
      setError("");
      const params = new URLSearchParams();
      if (searchTerm.trim()) {
        params.append("search", searchTerm.trim());
      }

      const response = await fetch(`${API_URL}/authors?${params.toString()}`);
      if (!response.ok) throw new Error("Could not load authors.");

      const data = await response.json();
      setAuthors(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAuthors();
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    fetchAuthors(search);
  };

  const handleReset = () => {
    setSearch("");
    fetchAuthors("");
  };

  return (
    <main className="main" style={{ paddingTop: "36px", paddingBottom: "70px" }}>
      <div className="section-heading">
        <div>
          <h3>Discover Authors</h3>
          <p style={{ color: "#64748b" }}>
            Explore biographies and browse books by your favorite writers
          </p>
        </div>
        {!loading && <span>{authors.length} authors</span>}
      </div>

      {/* Search Bar */}
      <form
        onSubmit={handleSearch}
        className="filters"
        style={{ display: "flex", gap: "12px", flexWrap: "wrap", alignItems: "center" }}
      >
        <input
         name="autor-search"
          type="text"
          placeholder="Search author by name..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            flex: "1 1 250px",
            padding: "12px",
            border: "1px solid #d1d5db",
            borderRadius: "7px",
            fontSize: "14px"
          }}
        />
        <div className="filter-buttons" style={{ marginTop: 0 }}>
          <button type="submit">Search</button>
          {search && (
            <button type="button" className="reset-button" onClick={handleReset}>
              Reset
            </button>
          )}
        </div>
      </form>

      {loading && <p>Loading authors...</p>}
      {error && <p className="error">{error}</p>}

      {!loading && !error && authors.length === 0 && (
        <div className="empty">
          <h3>No authors found</h3>
          <p>Try searching with a different name.</p>
        </div>
      )}

      {!loading && !error && authors.length > 0 && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
            gap: "24px"
          }}
        >
          {authors.map((author) => (
            <article
              key={author.coda}
              style={{
                background: "#ffffff",
                border: "1px solid #e2e8f0",
                borderRadius: "10px",
                padding: "24px",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                boxShadow: "0 2px 8px rgba(0, 0, 0, 0.04)"
              }}
            >
              <div>
                {/* Author Header with Portrait & Name */}
                <div style={{ display: "flex", gap: "16px", alignItems: "center", marginBottom: "16px" }}>
                  <img
                    src="https://images.unsplash.com/vector-1785009505254-5993cd32a968?q=80&w=988&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=NHwxMjA3fDA%3D"
                    alt={author.nume}
                    style={{
                      width: "64px",
                      height: "64px",
                      borderRadius: "50%",
                      objectFit: "cover",
                      border: "2px solid #cbd5e1"
                    }}
                  />
                  <div>
                    <h3
                      style={{
                        margin: "0 0 4px",
                        fontFamily: "Georgia, serif",
                        fontSize: "20px",
                        color: "#0f172a"
                      }}
                    >
                      {author.nume}
                    </h3>
                  </div>
                </div>

                <p
                  style={{
                    overflowWrap: "anywhere",
                    wordBreak: "break-word",
                    color: "#475569",
                    fontSize: "14px",
                    lineHeight: "1.6",
                    marginBottom: "20px"
                  }}
                
                >
                  {author.biografie || "No biography available."}
                </p>
              </div>

              <div style={{ borderTop: "1px solid #f1f5f9", paddingTop: "14px" }}>
                <span
                  style={{
                    display: "block",
                    fontSize: "12px",
                    fontWeight: "700",
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    color: "#64748b",
                    marginBottom: "10px"
                  }}
                >
                  Books in catalog ({author.carti.length})
                </span>

                {author.carti.length === 0 ? (
                  <span style={{ fontSize: "13px", color: "#94a3b8" }}>
                    No books listed yet.
                  </span>
                ) : (
                  <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "8px" }}>
                    {author.carti.map((book) => (
                      <li
                        key={book.codcar}
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          background: "#f8fafc",
                          padding: "8px 12px",
                          borderRadius: "6px",
                          fontSize: "13px"
                        }}
                      >
                        <Link
                          to={`/book/${book.codcar}`}
                          style={{ fontWeight: "600", color: "#081329" }}
                        >
                          {book.titlu}
                        </Link>
                        <span style={{ color: "#334155", fontWeight: "500" }}>
                          {Number(book.pret).toFixed(2)} lei
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </main>
  );
}