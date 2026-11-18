import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import defaultCover from '../assets/book-cover.jpg';

export function BookDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [book, setBook] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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

  const handleAddToCart = (bookId) => {
    console.log('Added to cart:', bookId);
  };

  const handleSaveBook = (bookId) => {
    console.log('Saved:', bookId);
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
          <button onClick={() => handleSaveBook(book.codcar)} className="save-btn">
            Save
          </button>
          <button
            disabled={book.stoc <= 0}
            onClick={() => handleAddToCart(book.codcar)}
            className={`cart-btn ${book.stoc <= 0 ? 'disabled' : ''}`}
          >
            Add to cart
          </button>
        </div>

        {/* Two-Column Layout for Book Cover and Content */}
        <div className="book-content-layout">
          {/* Book Cover Photo Spot */}
          <div className="book-cover-section">
           
              <img src={defaultCover} alt={book.titlu} className="book-cover-image" />
          
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