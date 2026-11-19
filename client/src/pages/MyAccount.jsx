import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const API_URL = (import.meta.env.VITE_API_URL || "http://localhost:5000/api").replace(/\/$/, "");

export default function MyAccount() {
  const { user } = useAuth();
  const [savedBooks, setSavedBooks] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loadingLists, setLoadingLists] = useState(false);
  const [listError, setListError] = useState("");

  useEffect(() => {
    if (!user || user.role !== "client") return;

    const fetchClientData = async () => {
      try {
        setLoadingLists(true);
        setListError("");

        const [savedRes, ordersRes] = await Promise.all([
          fetch(`${API_URL}/saved`, { credentials: "include" }),
          fetch(`${API_URL}/orders`, { credentials: "include" })
        ]);

        if (!savedRes.ok || !ordersRes.ok) {
          throw new Error("Could not load saved books or order history.");
        }

        const [savedData, ordersData] = await Promise.all([
          savedRes.json(),
          ordersRes.json()
        ]);

        setSavedBooks(savedData);
        setOrders(ordersData);
      } catch (err) {
        setListError(err.message);
      } finally {
        setLoadingLists(false);
      }
    };

    fetchClientData();
  }, [user]);

  const handleRemoveSaved = async (codcar) => {
    try {
      const res = await fetch(`${API_URL}/saved/${codcar}`, {
        method: "DELETE",
        credentials: "include"
      });
      if (!res.ok) throw new Error("Failed to remove saved book");
      setSavedBooks((prev) => prev.filter((book) => book.codcar !== codcar));
    } catch (err) {
      alert(err.message);
    }
  };

  const handleMoveToCart = async (codcar) => {
    try {
      const res = await fetch(`${API_URL}/cart`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ codcar, nr_ex: 1 }),
        credentials: "include"
      });
      if (!res.ok) throw new Error("Failed to add book to cart");
      alert("Book added to cart!");
    } catch (err) {
      alert(err.message);
    }
  };

  if (!user) return null;

  return (
    <main className="main" style={{ paddingTop: "36px", paddingBottom: "70px", maxWidth: "900px" }}>
      <h2>My Account</h2>
      <p style={{ color: "#475569" }}>
        {user.nume} {user.prenume} · {user.email}
      </p>

      {user.role === "client" && (
        <>
          {loadingLists && <p style={{ marginTop: "20px" }}>Loading your saved books and orders...</p>}
          {listError && <p className="error" style={{ marginTop: "20px" }}>{listError}</p>}

          {/* Saved Books Section */}
          <section style={{ marginTop: "32px" }}>
            <h3>Saved Books ({savedBooks.length})</h3>
            {savedBooks.length === 0 ? (
              <p style={{ color: "#64748b", marginTop: "8px" }}>No saved books yet.</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginTop: "14px" }}>
                {savedBooks.map((book) => (
                  <div
                    key={book.codcar}
                    style={{
                      background: "#fff",
                      border: "1px solid #e2e8f0",
                      borderRadius: "8px",
                      padding: "14px 16px",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      gap: "12px"
                    }}
                  >
                    <div>
                      <Link
                        to={`/book/${book.codcar}`}
                        style={{ fontWeight: "600", color: "#081329", textDecoration: "none" }}
                      >
                        {book.titlu}
                      </Link>
                      <div style={{ fontSize: "13px", color: "#64748b", marginTop: "2px" }}>
                        {book.editura} · {book.limba} · {Number(book.pret).toFixed(2)} lei ·{" "}
                        {book.stoc > 0 ? `${book.stoc} in stock` : "Out of stock"}
                      </div>
                    </div>

                    <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                      <button
                        type="button"
                        disabled={book.stoc <= 0}
                        onClick={() => handleMoveToCart(book.codcar)}
                        className="details-btn"
                        style={{
                          padding: "6px 12px",
                          cursor: book.stoc > 0 ? "pointer" : "not-allowed",
                          opacity: book.stoc > 0 ? 1 : 0.6
                        }}
                      >
                        Add to cart
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRemoveSaved(book.codcar)}
                        style={{
                          background: "#fef3c7",
                          color: "#b45309",
                          border: "1px solid #f59e0b",
                          padding: "6px 12px",
                          borderRadius: "6px",
                          cursor: "pointer",
                          fontWeight: "600"
                        }}
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Order History Section */}
          <section style={{ marginTop: "40px" }}>
            <h3>Order History ({orders.length})</h3>
            {orders.length === 0 ? (
              <p style={{ color: "#64748b", marginTop: "8px" }}>You haven&apos;t placed any orders yet.</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginTop: "14px" }}>
                {orders.map((order) => (
                  <div
                    key={order.order_row_id}
                    style={{
                      background: "#fff",
                      border: "1px solid #e2e8f0",
                      borderRadius: "8px",
                      padding: "14px 16px",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      gap: "12px"
                    }}
                  >
                    <div>
                      <Link
                        to={`/book/${order.codcar}`}
                        style={{ fontWeight: "600", color: "#081329", textDecoration: "none" }}
                      >
                        {order.titlu}
                      </Link>
                      <div style={{ fontSize: "13px", color: "#64748b", marginTop: "2px" }}>
                        {order.editura} · {order.limba} · Copies: {order.nr_ex} ·{" "}
                        {new Date(order.data_vanzare).toLocaleDateString("ro-RO")}
                      </div>
                    </div>

                    <strong style={{ fontSize: "15px", color: "#0f172a" }}>
                      {Number(order.subtotal).toFixed(2)} lei
                    </strong>
                  </div>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </main>
  );
}