import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

function parseCsvRows(text) {
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const next = text[i + 1];

    if (inQuotes) {
      if (char === '"' && next === '"') {
        field += '"';
        i++;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        field += char;
      }
    } else if (char === '"') {
      inQuotes = true;
    } else if (char === ',') {
      row.push(field.trim());
      field = '';
    } else if (char === '\n' || (char === '\r' && next === '\n')) {
      row.push(field.trim());
      if (row.some((cell) => cell !== '')) {
        rows.push(row);
      }
      row = [];
      field = '';
      if (char === '\r') i++;
    } else {
      field += char;
    }
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field.trim());
    if (row.some((cell) => cell !== '')) {
      rows.push(row);
    }
  }

  if (rows.length < 2) return [];
  const headers = rows[0].map((h) => h.replace(/^"|"$/g, '').trim());

  return rows.slice(1).map((cells) => {
    const entry = {};
    headers.forEach((header, idx) => {
      entry[header] = (cells[idx] || '').replace(/^"|"$/g, '').trim();
    });
    return entry;
  });
}

function cleanIsbn(raw) {
  if (!raw) return '';
  return raw.replace(/^[="'\s]+|[="'\s-]+$/g, '').toLowerCase();
}

function normalizeTitle(title) {
  if (!title) return '';
  return title
    .toLowerCase()
    .replace(/\(.*?\)/g, '')
    .replace(/[^a-z0-9\u0080-\u024f\s]/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function formatBookAuthors(book) {
  if (Array.isArray(book.autori) && book.autori.length > 0) {
    return book.autori.map((a) => a.nume).filter(Boolean).join(', ');
  }
  return 'Unknown Author';
}

export function GoodreadsShelfMatcher() {
  const navigate = useNavigate();
  const [catalog, setCatalog] = useState([]);
  const [loadingCatalog, setLoadingCatalog] = useState(true);
  const [catalogError, setCatalogError] = useState(null);

  const [wantToReadItems, setWantToReadItems] = useState([]);
  const [matches, setMatches] = useState([]);
  const [unmatched, setUnmatched] = useState([]);
  const [fileName, setFileName] = useState('');

  const API_URL = (
    import.meta.env.VITE_API_URL || "http://localhost:5000/api"
  ).replace(/\/$/, ""); // matches API_URL pattern in BookDetail.jsx[cite: 1] and App.jsx

  useEffect(() => {
    const loadCatalog = async () => {
      setLoadingCatalog(true);
      setCatalogError(null);
      try {
        const res = await fetch(`${API_URL}/books`);
        if (!res.ok) throw new Error("Couldn't load catalog books.");
        const data = await res.json();
        setCatalog(Array.isArray(data) ? data : []);
      } catch (err) {
        setCatalogError(err.message || 'Failed to load catalog.');
      } finally {
        setLoadingCatalog(false);
      }
    };

    loadCatalog();
  }, [API_URL]);

  const matchBooksAgainstCatalog = (wantList, books) => {
    const byIsbn = new Map();
    const byTitle = new Map();

    books.forEach((book) => {
      const isbnKey = cleanIsbn(book.isbn);
      if (isbnKey) byIsbn.set(isbnKey, book);

      const titleKey = normalizeTitle(book.titlu);
      if (titleKey && !byTitle.has(titleKey)) {
        byTitle.set(titleKey, book);
      }
    });

    const found = [];
    const missing = [];
    const seenBookIds = new Set();

    wantList.forEach((item, index) => {
      const isbn13 = cleanIsbn(item['ISBN13']);
      const isbn10 = cleanIsbn(item['ISBN']);
      const titleKey = normalizeTitle(item['Title']);

      const matchedBook =
        (isbn13 && byIsbn.get(isbn13)) ||
        (isbn10 && byIsbn.get(isbn10)) ||
        (titleKey && byTitle.get(titleKey)) ||
        null;

      if (matchedBook && !seenBookIds.has(matchedBook.codcar)) {
        seenBookIds.add(matchedBook.codcar);
        found.push(matchedBook);
      } else if (!matchedBook) {
        missing.push({
          id: `${titleKey || 'item'}-${index}`,
          title: item['Title'] || 'Untitled',
          author: item['Author'] || 'Unknown Author',
        });
      }
    });

    setMatches(found);
    setUnmatched(missing);
  };


    const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; 
    const MAX_ROWS = 5000;

    const [uploadError, setUploadError] = useState(null);

    const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadError(null);

    if (!file.name.toLowerCase().endsWith('.csv')) {
        setUploadError('Please select a valid .csv file exported from Goodreads.');
        e.target.value = '';
        return;
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
        setUploadError('File is too large (max 5 MB).');
        e.target.value = '';
        return;
    }

    try {
        setFileName(file.name);
        const text = await file.text();
        const rows = parseCsvRows(text).slice(0, MAX_ROWS);

        if (rows.length === 0 || !('Title' in rows[0]) || !('Exclusive Shelf' in rows[0])) {
        setUploadError('This file does not look like a Goodreads library export CSV.');
        setWantToReadItems([]);
        setMatches([]);
        setUnmatched([]);
        return;
        }

        const toRead = rows.filter(
        (row) => (row['Exclusive Shelf'] || '').toLowerCase() === 'to-read'
        );

        setWantToReadItems(toRead);
        matchBooksAgainstCatalog(toRead, catalog);
    } catch {
        setUploadError('Could not read the selected file.');
    }
    };


  return (
    <div className="goodreads-matcher-container">
      <div className="shelf-top-bar">
        <button onClick={() => navigate('/')} className="back-link">
          ← Back to Catalog
        </button>
        <div className="shelf-header-text">
          <h1>Goodreads &ldquo;Want to Read&rdquo; Finder</h1>
          <p>
            Export your library from Goodreads (<strong>My Books → Import and export → Export Library</strong>) and upload the CSV here.
          </p>
        </div>
      </div>

      {loadingCatalog && <p className="results-count">Loading store catalog...</p>}
      {catalogError && <p className="text-red">{catalogError}</p>}

      <div className="goodreads-upload-box">
        <label htmlFor="goodreads-csv-input" className="goodreads-upload-label">
          Choose Goodreads CSV Export
        </label>
        <input
          id="goodreads-csv-input"
          type="file"
          accept=".csv,text/csv"
          onChange={handleFileUpload}
          disabled={loadingCatalog}
        />
        {fileName && (
          <p className="results-count">
            Loaded <strong>{fileName}</strong> — found <strong>{wantToReadItems.length}</strong> &ldquo;Want to Read&rdquo; books ({matches.length} in catalog).
          </p>
        )}
      </div>

      {wantToReadItems.length > 0 && (
        <div className="goodreads-results">
          <section className="goodreads-section">
            <h2>Available in Catalog ({matches.length})</h2>
            {matches.length === 0 ? (
              <p className="results-count">None of your &ldquo;Want to Read&rdquo; books matched our current catalog.</p>
            ) : (
              <div className="goodreads-match-grid">
                {matches.map((book) => (
                  <div
                    key={book.codcar}
                    className="goodreads-match-card"
                    onClick={() => navigate(`/book/${book.codcar}`)} // matches route in App.jsx[cite: 3] and VirtualShelf.jsx[cite: 4]
                  >
                    <h3>{book.titlu}</h3>
                    <p className="goodreads-author">{formatBookAuthors(book)}</p>
                    <div className="goodreads-card-meta">
                      <span>{Number(book.pret).toFixed(2)} RON</span>
                      <span className={book.stoc > 0 ? 'text-green' : 'text-red'}>
                        {book.stoc > 0 ? `${book.stoc} buc.` : 'Out of stock'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {unmatched.length > 0 && (
            <section className="goodreads-section">
              <h2>Not Yet in Catalog ({unmatched.length})</h2>
              <ul className="goodreads-unmatched-list">
                {unmatched.map((item) => (
                  <li key={item.id}>
                    <strong>{item.title}</strong> — <span>{item.author}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      )}
    </div>
  );
}