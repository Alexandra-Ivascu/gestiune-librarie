import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const API_URL = (
  import.meta.env.VITE_API_URL || "http://localhost:5000/api"
).replace(/\/$/, "");

const initialBookForm = {
  titlu: "",
  isbn: "",
  descriere: "",
  pret: "",
  stoc: "1",
  data_publicare: "",
  limba: "",
  editura: "",
  nr_pag: "",
  authorIds: [],
  genreIds: []
};

export default function AdminPanel() {
  const { user, loading: authLoading } = useAuth();

  const [books, setBooks] = useState([]);
  const [authors, setAuthors] = useState([]);
  const [genres, setGenres] = useState([]);
  const [staff, setStaff] = useState([]);
  const [recentSales, setRecentSales] = useState([]);

  const [bookForm, setBookForm] = useState(initialBookForm);
  const [authorForm, setAuthorForm] = useState({ nume: "", biografie: "" });
  const [genreForm, setGenreForm] = useState({ denumire: "" });
  const [edits, setEdits] = useState({});

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [staffForm, setStaffForm] = useState({
  nume: "",
  prenume: "",
  email: "",
  parola: "",
  admin: false
});
const [creatingStaff, setCreatingStaff] = useState(false);
const [saleForm, setSaleForm] = useState({
  codcar: "",
  nr_ex: "1",
  clientEmail: ""
});
const [recordingSale, setRecordingSale] = useState(false);


const loadAdminData = async () => {
  try {
    setLoading(true);
    setError("");

    const booksRes = await fetch(`${API_URL}/books`);
    if (booksRes.ok) {
      const booksData = await booksRes.json();
      setBooks(booksData);

      const nextEdits = {};
      booksData.forEach((b) => {
        nextEdits[b.codcar] = {
          pret: String(b.pret),
          stoc: String(b.stoc)
        };
      });
      setEdits(nextEdits);
    }

    const optionsRes = await fetch(`${API_URL}/admin/options`, {
      credentials: "include"
    });
    const optionsData = await optionsRes.json().catch(() => ({}));

    if (!optionsRes.ok) {
      setError(optionsData.message || `Admin options request failed (${optionsRes.status})`);
      return;
    }

    setAuthors(optionsData.authors || []);
    setGenres(optionsData.genres || []);
    setStaff(optionsData.staff || []);
    setRecentSales(optionsData.recentSales || []);
  } catch (err) {
    setError(err.message || "Unexpected error loading admin panel.");
  } finally {
    setLoading(false);
  }
};

  useEffect(() => {
    if (!authLoading && user?.role === "angajat") {
      loadAdminData();
    } else if (!authLoading) {
      setLoading(false);
    }
  }, [user, authLoading]);

  const toggleMultiSelect = (field, id) => {
    const numId = Number(id);
    setBookForm((prev) => {
      const exists = prev[field].includes(numId);
      return {
        ...prev,
        [field]: exists
          ? prev[field].filter((item) => item !== numId)
          : [...prev[field], numId]
      };
    });
  };

  const handleCreateBook = async (e) => {
    e.preventDefault();
    setMessage("");
    setError("");
    setSubmitting(true);

    try {
      const res = await fetch(`${API_URL}/admin/books`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(bookForm)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to add book.");

      setBookForm(initialBookForm);
      setMessage(`Book "${data.titlu}" added to catalog.`);
      await loadAdminData();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveBookRow = async (codcar) => {
    setMessage("");
    setError("");
    const row = edits[codcar];
    if (!row) return;

    try {
      const res = await fetch(`${API_URL}/admin/books/${codcar}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          pret: Number(row.pret),
          stoc: Number(row.stoc)
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to update book.");

      setMessage(`Updated "${data.titlu}" (price: ${Number(data.pret).toFixed(2)} lei, stock: ${data.stoc}).`);
      await loadAdminData();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDeleteBook = async (codcar, titlu) => {
    if (!window.confirm(`Delete "${titlu}"? This removes related records as well.`)) return;
    setMessage("");
    setError("");

    try {
      const res = await fetch(`${API_URL}/admin/books/${codcar}`, {
        method: "DELETE",
        credentials: "include"
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to delete book.");

      setMessage(`Deleted "${titlu}".`);
      await loadAdminData();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleCreateAuthor = async (e) => {
    e.preventDefault();
    setMessage("");
    setError("");

    try {
      const res = await fetch(`${API_URL}/admin/authors`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(authorForm)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to add author.");

      setAuthorForm({ nume: "", biografie: "" });
      setMessage(`Added author "${data.nume}".`);
      await loadAdminData();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleCreateGenre = async (e) => {
    e.preventDefault();
    setMessage("");
    setError("");

    try {
      const res = await fetch(`${API_URL}/admin/genres`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(genreForm)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to add genre.");

      setGenreForm({ denumire: "" });
      setMessage(`Added genre "${data.denumire}".`);
      await loadAdminData();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleToggleStaffAdmin = async (member) => {
    setMessage("");
    setError("");

    try {
      const res = await fetch(`${API_URL}/admin/staff/${member.codang}/admin`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ admin: !member.admin })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to update staff role.");

      setMessage(`Updated ${data.prenume} ${data.nume} admin status to ${data.admin ? "Admin" : "Staff"}.`);
      await loadAdminData();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleCreateStaff = async (e) => {
  e.preventDefault();
  setMessage("");
  setError("");

  if (staffForm.parola.length < 12) {
    setError("Employee password must contain at least 12 characters.");
    return;
  }

  setCreatingStaff(true);
  try {
    const res = await fetch(`${API_URL}/admin/staff`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(staffForm)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "Failed to create employee account.");

    setStaffForm({ nume: "", prenume: "", email: "", parola: "", admin: false });
    setMessage(`Created employee account for ${data.staff.prenume} ${data.staff.nume}.`);
    await loadAdminData();
  } catch (err) {
    setError(err.message);
  } finally {
    setCreatingStaff(false);
  }
};

const handleRecordSale = async (e) => {
  e.preventDefault();
  setMessage("");
  setError("");
  setRecordingSale(true);

  try {
    const res = await fetch(`${API_URL}/admin/sales`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        codcar: Number(saleForm.codcar),
        nr_ex: Number(saleForm.nr_ex),
        clientEmail: saleForm.clientEmail.trim() || null
      })
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "Failed to record sale.");

    setSaleForm({ codcar: "", nr_ex: "1", clientEmail: "" });
    setMessage(
      `Recorded sale: "${data.titlu}" × ${data.nr_ex} (${Number(data.total).toFixed(2)} lei).`
    );
    await loadAdminData();
  } catch (err) {
    setError(err.message);
  } finally {
    setRecordingSale(false);
  }
};

  if (authLoading || loading) {
    return (
      <main className="main" style={{ padding: "36px" }}>
        <p>Loading admin panel...</p>
      </main>
    );
  }

  if (!user || user.role !== "angajat") {
    return (
      <main className="main" style={{ padding: "36px" }}>
        <div className="empty">
          <h3>Staff Access Required</h3>
          <p>You must be signed in as a bookstore staff member to view the admin panel.</p>
          <Link to="/" className="details-btn" style={{ display: "inline-block", marginTop: "14px" }}>
            Back to Catalog
          </Link>
        </div>
      </main>
    );
  }

  const cardStyle = {
    background: "#ffffff",
    border: "1px solid #e2e8f0",
    borderRadius: "10px",
    padding: "20px",
    marginTop: "20px"
  };

  const inputStyle = {
    padding: "10px",
    border: "1px solid #cbd5e1",
    borderRadius: "6px",
    fontSize: "14px",
    width: "100%"
  };

  return (
    <main className="main" style={{ paddingTop: "36px", paddingBottom: "70px" }}>
      <div className="section-heading">
        <div>
          <h2>Admin &amp; Staff Panel</h2>
          <p style={{ color: "#64748b" }}>
            Signed in as {user.prenume} {user.nume} ({user.admin ? "Admin" : "Staff"})
          </p>
        </div>
      </div>

      {message && (
        <div
          style={{
            padding: "12px 16px",
            borderRadius: "8px",
            background: "#ecfdf5",
            border: "1px solid #10b981",
            color: "#065f46",
            fontWeight: "600",
            marginBottom: "16px"
          }}
        >
          {message}
        </div>
      )}

      {error && (
        <div
          style={{
            padding: "12px 16px",
            borderRadius: "8px",
            background: "#fef2f2",
            border: "1px solid #ef4444",
            color: "#991b1b",
            fontWeight: "600",
            marginBottom: "16px"
          }}
        >
          {error}
        </div>
      )}

      {/* Add Book Form */}
      <section style={cardStyle}>
        <h3 style={{ marginTop: 0 }}>Add New Book</h3>
        <form onSubmit={handleCreateBook} style={{ display: "grid", gap: "12px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "12px" }}>
            <input
              type="text"
              placeholder="Title *"
              value={bookForm.titlu}
              onChange={(e) => setBookForm({ ...bookForm, titlu: e.target.value })}
              required
              style={inputStyle}
            />
            <input
              type="text"
              placeholder="ISBN (max 17 chars)"
              maxLength={17}
              value={bookForm.isbn}
              onChange={(e) => setBookForm({ ...bookForm, isbn: e.target.value })}
              style={inputStyle}
            />
            <input
              type="text"
              placeholder="Publisher (Editura) *"
              value={bookForm.editura}
              onChange={(e) => setBookForm({ ...bookForm, editura: e.target.value })}
              required
              style={inputStyle}
            />
            <input
              type="text"
              placeholder="Language (Limba) *"
              value={bookForm.limba}
              onChange={(e) => setBookForm({ ...bookForm, limba: e.target.value })}
              required
              style={inputStyle}
            />
            <input
              type="number"
              step="0.01"
              min="0"
              placeholder="Price (RON) *"
              value={bookForm.pret}
              onChange={(e) => setBookForm({ ...bookForm, pret: e.target.value })}
              required
              style={inputStyle}
            />
            <input
              type="number"
              min="0"
              placeholder="Stock *"
              value={bookForm.stoc}
              onChange={(e) => setBookForm({ ...bookForm, stoc: e.target.value })}
              required
              style={inputStyle}
            />
            <input
              type="number"
              min="1"
              placeholder="Pages *"
              value={bookForm.nr_pag}
              onChange={(e) => setBookForm({ ...bookForm, nr_pag: e.target.value })}
              required
              style={inputStyle}
            />
            <input
              type="date"
              value={bookForm.data_publicare}
              onChange={(e) => setBookForm({ ...bookForm, data_publicare: e.target.value })}
              style={inputStyle}
            />
          </div>

          <textarea
            rows={3}
            placeholder="Description"
            value={bookForm.descriere}
            onChange={(e) => setBookForm({ ...bookForm, descriere: e.target.value })}
            style={inputStyle}
          />

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "16px" }}>
            <div>
              <strong style={{ fontSize: "13px", display: "block", marginBottom: "6px" }}>Authors:</strong>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", maxHeight: "110px", overflowY: "auto" }}>
                {authors.map((a) => (
                  <label key={a.coda} style={{ fontSize: "13px", display: "flex", alignItems: "center", gap: "4px" }}>
                    <input
                      type="checkbox"
                      checked={bookForm.authorIds.includes(Number(a.coda))}
                      onChange={() => toggleMultiSelect("authorIds", a.coda)}
                    />
                    {a.nume}
                  </label>
                ))}
              </div>
            </div>

            <div>
              <strong style={{ fontSize: "13px", display: "block", marginBottom: "6px" }}>Genres:</strong>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", maxHeight: "110px", overflowY: "auto" }}>
                {genres.map((g) => (
                  <label key={g.codg} style={{ fontSize: "13px", display: "flex", alignItems: "center", gap: "4px" }}>
                    <input
                      type="checkbox"
                      checked={bookForm.genreIds.includes(Number(g.codg))}
                      onChange={() => toggleMultiSelect("genreIds", g.codg)}
                    />
                    {g.denumire}
                  </label>
                ))}
              </div>
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={submitting}
              className="details-btn"
              style={{ border: "none", padding: "10px 18px", cursor: "pointer" }}
            >
              {submitting ? "Saving..." : "Add Book"}
            </button>
          </div>
        </form>
      </section>

      {/* Add Author & Add Genre */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "16px" }}>
        <section style={cardStyle}>
          <h3 style={{ marginTop: 0 }}>Add Author</h3>
          <form onSubmit={handleCreateAuthor} style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            <input
              type="text"
              placeholder="Author name *"
              value={authorForm.nume}
              onChange={(e) => setAuthorForm({ ...authorForm, nume: e.target.value })}
              required
              style={inputStyle}
            />
            <textarea
              rows={2}
              placeholder="Biography (optional)"
              value={authorForm.biografie}
              onChange={(e) => setAuthorForm({ ...authorForm, biografie: e.target.value })}
              style={inputStyle}
            />
            <button type="submit" className="details-btn" style={{ border: "none", padding: "8px 14px", cursor: "pointer", alignSelf: "flex-start" }}>
              Add Author
            </button>
          </form>
        </section>

        <section style={cardStyle}>
          <h3 style={{ marginTop: 0 }}>Add Genre</h3>
          <form onSubmit={handleCreateGenre} style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            <input
              type="text"
              placeholder="Genre name *"
              value={genreForm.denumire}
              onChange={(e) => setGenreForm({ ...genreForm, denumire: e.target.value })}
              required
              style={inputStyle}
            />
            <button type="submit" className="details-btn" style={{ border: "none", padding: "8px 14px", cursor: "pointer", alignSelf: "flex-start" }}>
              Add Genre
            </button>
          </form>
        </section>
      </div>

      {/* Books Stock & Price Table */}
         {user.admin && (
      <section style={cardStyle}>
        <h3 style={{ marginTop: 0 }}>Catalog Inventory ({books.length})</h3>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "14px" }}>
            <thead>
              <tr style={{ borderBottom: "2px solid #e2e8f0", textAlign: "left" }}>
                <th style={{ padding: "10px" }}>Title</th>
                <th style={{ padding: "10px" }}>Publisher</th>
                <th style={{ padding: "10px" }}>Price (lei)</th>
                <th style={{ padding: "10px" }}>Stock</th>
                <th style={{ padding: "10px" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {books.map((book) => {
                const row = edits[book.codcar] || { pret: book.pret, stoc: book.stoc };
                return (
                  <tr key={book.codcar} style={{ borderBottom: "1px solid #f1f5f9" }}>
                    <td style={{ padding: "10px", fontWeight: "600" }}>
                      <Link to={`/book/${book.codcar}`}>{book.titlu}</Link>
                    </td>
                    <td style={{ padding: "10px", color: "#64748b" }}>{book.editura}</td>
                    <td style={{ padding: "10px" }}>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={row.pret}
                        onChange={(e) =>
                          setEdits((prev) => ({
                            ...prev,
                            [book.codcar]: { ...row, pret: e.target.value }
                          }))
                        }
                        style={{ ...inputStyle, width: "95px", padding: "6px" }}
                      />
                    </td>
                    <td style={{ padding: "10px" }}>
                      <input
                        type="number"
                        min="0"
                        value={row.stoc}
                        onChange={(e) =>
                          setEdits((prev) => ({
                            ...prev,
                            [book.codcar]: { ...row, stoc: e.target.value }
                          }))
                        }
                        style={{ ...inputStyle, width: "80px", padding: "6px" }}
                      />
                    </td>
                    <td style={{ padding: "10px", display: "flex", gap: "8px" }}>
                      <button
                        type="button"
                        onClick={() => handleSaveBookRow(book.codcar)}
                        style={{
                          padding: "6px 12px",
                          background: "#2563eb",
                          color: "#fff",
                          border: "none",
                          borderRadius: "6px",
                          cursor: "pointer",
                          fontWeight: "600"
                        }}
                      >
                        Save
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteBook(book.codcar, book.titlu)}
                        style={{
                          padding: "6px 12px",
                          background: "#fee2e2",
                          color: "#dc2626",
                          border: "none",
                          borderRadius: "6px",
                          cursor: "pointer",
                          fontWeight: "600"
                        }}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
         )}
            {/* Record In-Store Sale (All Employees) */}
        <section style={cardStyle}>
        <h3 style={{ marginTop: 0 }}>Record In-Store Sale</h3>
        <form onSubmit={handleRecordSale} style={{ display: "grid", gap: "12px" }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: "12px" }}>
            <select
                value={saleForm.codcar}
                onChange={(e) => setSaleForm({ ...saleForm, codcar: e.target.value })}
                required
                style={inputStyle}
            >
                <option value="">Select a book *</option>
                {books
                .filter((b) => Number(b.stoc) > 0)
                .map((b) => (
                    <option key={b.codcar} value={b.codcar}>
                    {b.titlu} — {Number(b.pret).toFixed(2)} lei ({b.stoc} in stock)
                    </option>
                ))}
            </select>

            <input
                type="number"
                min="1"
                placeholder="Quantity *"
                value={saleForm.nr_ex}
                onChange={(e) => setSaleForm({ ...saleForm, nr_ex: e.target.value })}
                required
                style={inputStyle}
            />

            <input
                type="email"
                placeholder="Client email (optional)"
                value={saleForm.clientEmail}
                onChange={(e) => setSaleForm({ ...saleForm, clientEmail: e.target.value })}
                style={inputStyle}
            />
            </div>

            <div>
            <button
                type="submit"
                disabled={recordingSale}
                className="details-btn"
                style={{ border: "none", padding: "9px 16px", cursor: "pointer" }}
            >
                {recordingSale ? "Recording..." : "Record Sale"}
            </button>
            </div>
        </form>
        </section>

      {/* Recent Sales */}
      <section style={cardStyle}>
        <h3 style={{ marginTop: 0 }}>Recent Sales ({recentSales.length})</h3>
        {recentSales.length === 0 ? (
          <p style={{ color: "#64748b" }}>No sales recorded yet.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {recentSales.map((sale, idx) => (
              <div
                key={`${sale.codcar}-${sale.data_vanzare}-${idx}`}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  padding: "10px 12px",
                  background: "#f8fafc",
                  borderRadius: "6px",
                  fontSize: "13px"
                }}
              >
                <span>
                  <strong>{sale.titlu}</strong> × {sale.nr_ex} — {sale.client_email || "Walk-in / Guest"}
                </span>
                <span>
                  <strong>{Number(sale.subtotal).toFixed(2)} lei</strong> ·{" "}
                  {new Date(sale.data_vanzare).toLocaleDateString("ro-RO")}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Staff Role Management (Admin Only) */}
        {user.admin && (
        <section style={cardStyle}>
            <h3 style={{ marginTop: 0 }}>Create Employee Account</h3>
            <form onSubmit={handleCreateStaff} style={{ display: "grid", gap: "12px", marginBottom: "24px" }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: "12px" }}>
                <input
                type="text"
                placeholder="Last Name (Nume) *"
                value={staffForm.nume}
                onChange={(e) => setStaffForm({ ...staffForm, nume: e.target.value })}
                required
                style={inputStyle}
                />
                <input
                type="text"
                placeholder="First Name (Prenume) *"
                value={staffForm.prenume}
                onChange={(e) => setStaffForm({ ...staffForm, prenume: e.target.value })}
                required
                style={inputStyle}
                />
                <input
                type="email"
                placeholder="Email *"
                value={staffForm.email}
                onChange={(e) => setStaffForm({ ...staffForm, email: e.target.value })}
                required
                style={inputStyle}
                />
                <input
                type="password"
                placeholder="Password (min. 12 chars) *"
                value={staffForm.parola}
                onChange={(e) => setStaffForm({ ...staffForm, parola: e.target.value })}
                required
                style={inputStyle}
                />
            </div>

            <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "14px" }}>
                <input
                type="checkbox"
                checked={staffForm.admin}
                onChange={(e) => setStaffForm({ ...staffForm, admin: e.target.checked })}
                />
                Grant Admin privileges
            </label>

            <div>
                <button
                type="submit"
                disabled={creatingStaff}
                className="details-btn"
                style={{ border: "none", padding: "9px 16px", cursor: "pointer" }}
                >
                {creatingStaff ? "Creating..." : "Create Employee"}
                </button>
            </div>
            </form>

            <h3 style={{ marginTop: 0 }}>Staff &amp; Admin Roles</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {staff.map((member) => (
                <div
                key={member.codang}
                style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "10px 12px",
                    background: "#f8fafc",
                    borderRadius: "6px",
                    fontSize: "14px"
                }}
                >
                <span>
                    <strong>{member.prenume} {member.nume}</strong> ({member.email}) —{" "}
                    <span style={{ color: member.admin ? "#059669" : "#64748b", fontWeight: "600" }}>
                    {member.admin ? "Admin" : "Staff"}
                    </span>
                </span>
                <button
                    type="button"
                    onClick={() => handleToggleStaffAdmin(member)}
                    style={{
                    padding: "6px 12px",
                    borderRadius: "6px",
                    border: "1px solid #cbd5e1",
                    background: "#fff",
                    cursor: "pointer",
                    fontWeight: "600"
                    }}
                >
                    {member.admin ? "Revoke Admin" : "Make Admin"}
                </button>
                </div>
            ))}
            </div>
        </section>
        )}
    </main>
  );
}