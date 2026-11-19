import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import defaultCover from '../assets/book-cover.jpg';
import { useAuth } from "../context/AuthContext";

export function BookDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [book, setBook] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [myRating, setMyRating] = useState(null);
  const [hoverRating, setHoverRating] = useState(0);
  const [savingRating, setSavingRating] = useState(false);

  const { user } = useAuth();

  const API_URL = (
    import.meta.env.VITE_API_URL || "http://localhost:5000/api"
  ).replace(/\/$/, "");

  useEffect(() => {
    const fetchBookDetails = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`${API_URL}/books/${id}`);
        if (!response.ok) throw new Error("Couldn't load book details.");
        const data = await response.json();
        setBook(data);
      } catch (err) {
        setError(err.message || 'An error has occurred.');
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchBookDetails();
    }
  }, [id, API_URL]);

  useEffect(() => {
    if (!user || user.role !== "client" || !id) {
      setMyRating(null);
      return;
    }

    fetch(`${API_URL}/books/${id}/my-rating`, { credentials: "include" })
      .then((res) => (res.ok ? res.json() : { nota: null }))
      .then((data) => setMyRating(data.nota))
      .catch((err) => console.error("Error loading user rating:", err));
  }, [id, user, API_URL]);

  const handleRateBook = async (nota) => {
    try {
      setSavingRating(true);
      const res = await fetch(`${API_URL}/books/${id}/rating`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nota }),
        credentials: "include"
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to save rating");

      setMyRating(data.nota);
      setBook((prev) => ({
        ...prev,
        avg_rating: data.avg_rating,
        rating_count: data.rating_count
      }));
    } catch (err) {
      alert(err.message);
    } finally {
      setSavingRating(false);
    }
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
          setSavedIds(savedData.map((itemId) => Number(itemId)));
        }
      } catch (err) {
        console.error("Error loading cart/saved state:", err);
      }
    };

    loadUserLists();
  }, [user, API_URL]);

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
        setCartIds((prev) => prev.filter((itemId) => itemId !== numericId));
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
        setSavedIds((prev) => prev.filter((itemId) => itemId !== numericId));
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

  if (loading) {
    return <div className="book-detail-loading">Loading book...</div>;
  }

  if (error || !book) {
    return (
      <div className="book-detail-error">
        <p>{error || "Couldn't find book."}</p>
        <button onClick={() => navigate('/')} className="back-btn">
          Back to Catalog
        </button>
      </div>
    );
  }

  return (
    <div className="book-detail-container">
      {/* Back Button */}
      <button onClick={() => navigate(-1)} className="back-link">
        ← Back
      </button>

      {/* Main Content Card */}
      <div className="book-detail-card">

        {/* Action Buttons in the Top Right Corner */}
        <div className="book-actions top-right-actions">
          {user?.role === "client" && (() => {
            const inCart = cartIds.includes(Number(book.codcar));
            const isSaved = savedIds.includes(Number(book.codcar));

            return (
              <div style={{ display: "flex", gap: "12px", marginTop: "-6px", marginBottom: "16px" }}>
                <button
                  type="button"
                  disabled={!inCart && book.stoc <= 0}
                  onClick={() => handleToggleCart(book.codcar, book.stoc)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    padding: "10px 18px",
                    background: inCart ? "#059669" : book.stoc > 0 ? "#2563eb" : "#94a3b8",
                    color: "#fff",
                    border: "none",
                    borderRadius: "6px",
                    fontWeight: "600",
                    cursor: !inCart && book.stoc <= 0 ? "not-allowed" : "pointer"
                  }}
                >
                  {inCart ? (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path>
                      <line x1="3" y1="6" x2="21" y2="6"></line>
                      <path d="M16 10a4 4 0 0 1-8 0"></path>
                    </svg>
                  )}
                  {inCart ? "In cart (Undo)" : "Add to cart"}
                </button>

                <button
                  type="button"
                  onClick={() => handleToggleSave(book.codcar)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    padding: "10px 18px",
                    background: isSaved ? "#fef3c7" : "#f1f5f9",
                    color: isSaved ? "#b45309" : "#334155",
                    border: isSaved ? "1px solid #f59e0b" : "1px solid #cbd5e1",
                    borderRadius: "6px",
                    fontWeight: "600",
                    cursor: "pointer"
                  }}
                >
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill={isSaved ? "currentColor" : "none"}
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path>
                  </svg>
                  {isSaved ? "Saved (Undo)" : "Save"}
                </button>
              </div>
            );
          })()}
        </div>

        {/* Two-Column Layout for Book Cover and Content */}
        <div className="book-content-layout">
          {/* Book Cover Photo Spot + Client Rating Selector */}
          <div
            className="book-cover-section"
            style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "16px" }}
          >
            <img src={defaultCover} alt={book.titlu} className="book-cover-image" />

            {user?.role === "client" && (
              <div
                style={{
                  width: "100%",
                  padding: "12px 14px",
                  background: "#f8fafc",
                  border: "1px solid #e2e8f0",
                  borderRadius: "8px",
                  textAlign: "center"
                }}
              >
                <div style={{ fontSize: "13px", fontWeight: "600", color: "#334155", marginBottom: "6px" }}>
                  {myRating ? `Your rating: ${myRating}/5 (click to update)` : "Rate this book:"}
                </div>
                <div style={{ display: "flex", justifyContent: "center", gap: "4px" }}>
                  {[1, 2, 3, 4, 5].map((star) => {
                    const active = (hoverRating || myRating || 0) >= star;
                    return (
                      <button
                        key={star}
                        type="button"
                        disabled={savingRating}
                        onMouseEnter={() => setHoverRating(star)}
                        onMouseLeave={() => setHoverRating(0)}
                        onClick={() => handleRateBook(star)}
                        aria-label={`Rate ${star} out of 5`}
                        style={{
                          background: "transparent",
                          border: "none",
                          padding: "2px 4px",
                          fontSize: "24px",
                          lineHeight: 1,
                          cursor: savingRating ? "not-allowed" : "pointer",
                          color: active ? "#f59e0b" : "#cbd5e1",
                          transition: "color 0.15s ease"
                        }}
                      >
                        ★
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Right Side Details Column */}
          <div className="book-details-section">
            {/* Header / Title & ISBN */}
            <div className="book-detail-header">
              <span className="book-isbn">ISBN: {book.isbn || 'N/A'}</span>
              <h1>{book.titlu}</h1>
              <p style={{ fontSize: '1.05rem', color: '#64748b', marginTop: '8px', fontWeight: '600' }}>
                By {book.autori && book.autori.length > 0 ? book.autori.map(a => a.nume).join(", ") : "Unknown Author"}
              </p>

              {/* Average Rating Summary */}
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "10px" }}>
                <span style={{ color: "#f59e0b", fontSize: "17px", fontWeight: "700" }}>
                  ★ {book.rating_count > 0 ? Number(book.avg_rating).toFixed(1) : "No ratings yet"}
                </span>
                {book.rating_count > 0 && (
                  <span style={{ color: "#64748b", fontSize: "14px" }}>
                    ({book.rating_count} {book.rating_count === 1 ? "rating" : "ratings"})
                  </span>
                )}
              </div>
            </div>

            {/* Metadata Grid */}
            <div className="book-meta-grid">
              <div className="meta-item">
                <span className="meta-label">Publisher</span>
                <span className="meta-value">{book.editura}</span>
              </div>
              <div className="meta-item">
                <span className="meta-label">Language</span>
                <span className="meta-value">{book.limba}</span>
              </div>
              <div className="meta-item">
                <span className="meta-label">Pages</span>
                <span className="meta-value">{book.nr_pag}</span>
              </div>
              <div className="meta-item">
                <span className="meta-label">Stock</span>
                <span className={`meta-value ${book.stoc > 0 ? 'text-green' : 'text-red'}`}>
                  {book.stoc > 0 ? `${book.stoc} buc.` : 'Out of stock'}
                </span>
              </div>
              <div className="meta-item">
                <span className="meta-label">Genres</span>
                <span className="meta-value" style={{ fontSize: '0.9rem' }}>
                  {book.genuri && book.genuri.length > 0
                    ? book.genuri.map(g => g.denumire).join(", ")
                    : "N/A"}
                </span>
              </div>
            </div>

            {/* Description Section */}
            <div className="book-description">
              <h2>About</h2>
              <p>{book.descriere || 'No description available'}</p>
            </div>

            {/* Footer / Price Block Only */}
            <div className="book-detail-footer">
              <div className="book-price-block">
                <span className="price-label">Price</span>
                <span className="price-value">{Number(book.pret).toFixed(2)} RON</span>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}