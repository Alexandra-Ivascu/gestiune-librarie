import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const SPINE_COLORS = [
  '#7c2d12', // Mahogany
  '#1e3a8a', // Navy Blue
  '#065f46', // Forest Green
  '#581c87', // Royal Purple
  '#881337', // Burgundy
  '#92400e', // Amber Leather
  '#115e59', // Deep Teal
  '#3730a3', // Indigo
  '#3f6212', // Olive
  '#1f2937', // Charcoal
];

export function VirtualShelfPage() {
  const navigate = useNavigate();
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Stroll state (offset in pixels; 0 = start of shelf, negative = strolled right)
  const [strollX, setStrollX] = useState(0);
  const [hoveredIndex, setHoveredIndex] = useState(null);
  const [isDragging, setIsDragging] = useState(false);

  const viewportRef = useRef(null);
  const trackRef = useRef(null);
  const dragStateRef = useRef({
    active: false,
    moved: false,
    startX: 0,
    startStrollX: 0,
  });

  const API_URL = (
    import.meta.env.VITE_API_URL || "http://localhost:5000/api"
  ).replace(/\/$/, "");

  useEffect(() => {
    const fetchBooks = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`${API_URL}/books`);
        if (!response.ok) throw new Error("Couldn't load books for the shelf.");
        const data = await response.json();
        setBooks(data);
      } catch (err) {
        setError(err.message || 'An error has occurred.');
      } finally {
        setLoading(false);
      }
    };

    fetchBooks();
  }, [API_URL]);

  // Clamp stroll offset within valid shelf bounds
  const clampStroll = (nextX) => {
    const viewport = viewportRef.current;
    const track = trackRef.current;
    if (!viewport || !track) return 0;

    const maxStroll = Math.max(0, track.scrollWidth - viewport.clientWidth);
    return Math.min(0, Math.max(-maxStroll, nextX));
  };

  // Re-clamp if window resizes or books change
  useEffect(() => {
    setStrollX((prev) => clampStroll(prev));
  }, [books]);

  // Keyboard left/right strolling
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        setStrollX((prev) => clampStroll(prev - 240));
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        setStrollX((prev) => clampStroll(prev + 240));
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [books]);

  // Translate vertical or horizontal wheel movement into a horizontal stroll
  const handleWheel = (e) => {
    const delta = Math.abs(e.deltaY) > Math.abs(e.deltaX) ? e.deltaY : e.deltaX;
    if (delta === 0) return;
    e.preventDefault();
    setStrollX((prev) => clampStroll(prev - delta * 1.1));
  };

  // Pointer drag-to-stroll along the shelf
  const handlePointerDown = (e) => {
    if (e.button !== 0) return;
    dragStateRef.current = {
      active: true,
      moved: false,
      startX: e.clientX,
      startStrollX: strollX,
    };
    setIsDragging(true);
  };

  const handlePointerMove = (e) => {
    if (!dragStateRef.current.active) return;
    const dx = e.clientX - dragStateRef.current.startX;
    if (Math.abs(dx) > 5) {
      dragStateRef.current.moved = true;
    }
    setStrollX(clampStroll(dragStateRef.current.startStrollX + dx));
  };

  const handlePointerUp = () => {
    if (!dragStateRef.current.active) return;
    dragStateRef.current.active = false;
    setIsDragging(false);
    setTimeout(() => {
      dragStateRef.current.moved = false;
    }, 0);
  };

  const handleBookClick = (bookId) => {
    if (dragStateRef.current.moved) return;
    navigate(`/book/${bookId}`);
  };

  const stepStroll = (direction) => {
    const step = 320;
    setStrollX((prev) => clampStroll(prev + direction * step));
  };

  // Deterministic styling based on book data; width adapts to title length
  const getSpineStyle = (book, index) => {
    const idNum = Number(book.codcar) || index;
    const color = SPINE_COLORS[idNum % SPINE_COLORS.length];

    // Slight height variation for visual realism (between 235px and 265px)
    const height = 235 + ((idNum * 7) % 30);

    // Subtle proximity lift when cursor passes nearby
    let liftY = 0;
    let scale = 1;
    let zIndex = 1;

    if (hoveredIndex !== null) {
      const distance = Math.abs(hoveredIndex - index);
      if (distance === 0) {
        liftY = -20;
        scale = 1.04;
        zIndex = 6;
      } else if (distance === 1) {
        liftY = -8;
        scale = 1.015;
        zIndex = 4;
      } else if (distance === 2) {
        liftY = -3;
        zIndex = 2;
      }
    }

    return {
      backgroundColor: color,
      height: `${height}px`,
      transform: `translateY(${liftY}px) scale(${scale})`,
      zIndex,
    };
  };

  const viewport = viewportRef.current;
  const track = trackRef.current;
  const maxStroll = viewport && track ? Math.max(0, track.scrollWidth - viewport.clientWidth) : 0;
  const progress = maxStroll > 0 ? Math.min(1, Math.max(0, Math.abs(strollX) / maxStroll)) : 0;

  if (loading) {
    return <div className="book-detail-loading">Arranging the shelves...</div>;
  }

  if (error) {
    return (
      <div className="book-detail-error">
        <p>{error}</p>
        <button onClick={() => navigate('/')} className="back-btn">
          Back to Catalog
        </button>
      </div>
    );
  }

  return (
    <div className="virtual-shelf-container">
      <div className="shelf-top-bar">
        <button onClick={() => navigate('/')} className="back-link">
          ← Back to Catalog
        </button>
        <div className="shelf-header-text">
          <h1>Virtual Bookshelf</h1>
          <p>Drag, use the wheel or arrow keys to stroll along the shelf, and click a spine to inspect</p>
        </div>
      </div>

      <div className="bookcase stroll-bookcase">
        {books.length === 0 ? (
          <p className="empty-shelf-msg">The shelves are currently empty.</p>
        ) : (
          <>
            <button
              type="button"
              className="stroll-arrow stroll-arrow-left"
              onClick={() => stepStroll(1)}
              disabled={strollX >= 0}
              aria-label="Stroll left along shelf"
              title="Stroll left"
            >
              ‹
            </button>

            <div
              ref={viewportRef}
              className={`stroll-viewport ${isDragging ? 'is-dragging' : ''}`}
              onWheel={handleWheel}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerLeave={() => {
                handlePointerUp();
                setHoveredIndex(null);
              }}
            >
              <div
                ref={trackRef}
                className="stroll-track"
                style={{
                  transform: `translate3d(${strollX}px, 0, 0)`,
                  transition: isDragging ? 'none' : 'transform 0.35s cubic-bezier(0.22, 1, 0.36, 1)',
                }}
              >
                <div className="shelf-books stroll-books">
                  {books.map((book, index) => (
                    <div
                      key={book.codcar}
                      className="book-spine"
                      style={getSpineStyle(book, index)}
                      onMouseEnter={() => setHoveredIndex(index)}
                      onClick={() => handleBookClick(book.codcar)}
                      title={book.titlu}
                    >
                      <div className="spine-band top-band" />
                      <span className="spine-title">{book.titlu}</span>
                      <div className="spine-band bottom-band" />
                    </div>
                  ))}
                </div>
                <div className="wooden-plank stroll-plank" />
              </div>
            </div>

            <button
              type="button"
              className="stroll-arrow stroll-arrow-right"
              onClick={() => stepStroll(-1)}
              disabled={Math.abs(strollX) >= maxStroll}
              aria-label="Stroll right along shelf"
              title="Stroll right"
            >
              ›
            </button>
          </>
        )}
      </div>

      {books.length > 0 && (
        <div className="stroll-rail-wrapper" aria-hidden="true">
          <div className="stroll-rail-track">
            <div
              className="stroll-rail-indicator"
              style={{ transform: `translateX(${progress * 240}%)` }}
            />
          </div>
          <span className="stroll-caption">
            {books.length} {books.length === 1 ? 'book' : 'books'} on display
          </span>
        </div>
      )}
    </div>
  );
}