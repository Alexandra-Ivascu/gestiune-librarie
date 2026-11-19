import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

const API_URL = (import.meta.env.VITE_API_URL || "http://localhost:5000/api").replace(/\/$/, "");

export default function Cart() {
  const [cartItems, setCartItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [checkingOut, setCheckingOut] = useState(false);
  const [checkoutSuccess, setCheckoutSuccess] = useState("");

  const fetchCart = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/cart`, { credentials: "include" });
      if (!res.ok) throw new Error("Could not load shopping cart.");
      const data = await res.json();
      setCartItems(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCart();
  }, []);

  const removeItem = async (codcar) => {
    try {
      const res = await fetch(`${API_URL}/cart/${codcar}`, {
        method: "DELETE",
        credentials: "include"
      });
      if (!res.ok) throw new Error("Failed to remove item");
      setCartItems(cartItems.filter((item) => item.codcar !== codcar));
    } catch (err) {
      alert(err.message);
    }
  };

  const updateQuantity = async (codcar, nextQty) => {
    if (nextQty < 1) return;

    try {
      const res = await fetch(`${API_URL}/cart/${codcar}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nr_ex: nextQty }),
        credentials: "include"
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to update quantity");

      setCartItems((prev) =>
        prev.map((item) =>
          item.codcar === codcar ? { ...item, nr_ex: data.nr_ex } : item
        )
      );
    } catch (err) {
      alert(err.message);
    }
  };

  const handleCheckout = async () => {
    try {
      setCheckingOut(true);
      setCheckoutSuccess("");
      setError("");

      const res = await fetch(`${API_URL}/cart/checkout`, {
        method: "POST",
        credentials: "include"
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Checkout failed");
      }

      setCartItems([]);
      setCheckoutSuccess(
        `Order placed! ${data.itemsPurchased} book title(s) purchased — Total: ${Number(data.total).toFixed(2)} lei.`
      );
    } catch (err) {
      setError(err.message);
    } finally {
      setCheckingOut(false);
    }
  };

  const totalPrice = cartItems.reduce((sum, item) => sum + Number(item.pret) * item.nr_ex, 0);

  if (loading) return <main className="main" style={{ padding: "36px" }}><p>Loading cart...</p></main>;
  if (error) return <main className="main" style={{ padding: "36px" }}><p className="error">{error}</p></main>;

  return (
    <main className="main" style={{ paddingTop: "36px", paddingBottom: "70px", maxWidth: "800px" }}>
      <h2>Shopping Cart</h2>

      {checkoutSuccess && (
        <div
          style={{
            marginTop: "16px",
            padding: "14px 18px",
            borderRadius: "8px",
            background: "#ecfdf5",
            border: "1px solid #10b981",
            color: "#065f46",
            fontWeight: "600"
          }}
        >
          {checkoutSuccess}
        </div>
      )}

      {cartItems.length === 0 ? (
        <div className="empty" style={{ marginTop: "30px" }}>
          <h3>Your cart is empty</h3>
          <p>Explore our catalog and find something you love!</p>
          <Link
            to="/"
            onClick={() => setCheckoutSuccess("")}
            className="details-btn"
            style={{ display: "inline-block", marginTop: "16px", textDecoration: "none" }}
          >
            Browse Catalog
          </Link>
        </div>
      ) : (
        <div>
          <div style={{ display: "flex", flexDirection: "column", gap: "16px", marginTop: "20px" }}>
            {cartItems.map((item) => (
              <div
                key={item.codcar}
                style={{
                  background: "#fff",
                  border: "1px solid #e2e8f0",
                  borderRadius: "8px",
                  padding: "16px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center"
                }}
              >
                <div>
                  <h4>
                    <Link
                      to={`/book/${item.codcar}`}
                      style={{ fontWeight: "600", color: "#081329" }}
                    >
                      {item.titlu}
                    </Link>
                  </h4>

                  <span style={{ fontSize: "13px", color: "#64748b" }}>
                    {item.editura} · {item.limba} | Price: {Number(item.pret).toFixed(2)} lei × {item.nr_ex}
                  </span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                  <strong style={{ fontSize: "16px", color: "#0f172a" }}>
                    {(Number(item.pret) * item.nr_ex).toFixed(2)} lei
                  </strong>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <span style={{ minWidth: "70px", textAlign: "center" }}>
                      Copies: {item.nr_ex}
                    </span>
                    <button
                      type="button"
                      onClick={() => updateQuantity(item.codcar, item.nr_ex + 1)}
                      disabled={item.nr_ex >= item.stoc}
                      title={item.nr_ex >= item.stoc ? "Max stock reached" : "Increase copies"}
                      style={{
                        padding: "4px 10px",
                        borderRadius: "6px",
                        border: "1px solid #cbd5e1",
                        background: item.nr_ex >= item.stoc ? "#f1f5f9" : "#ffffff",
                        cursor: item.nr_ex >= item.stoc ? "not-allowed" : "pointer",
                        fontWeight: "600"
                      }}
                    >
                      +
                    </button>
                    <button
                      type="button"
                      onClick={() => updateQuantity(item.codcar, item.nr_ex - 1)}
                      disabled={item.nr_ex <= 1}
                      title={item.nr_ex <= 1 ? "Minimum is 1 copy (use Remove to delete)" : "Decrease copies"}
                      style={{
                        padding: "4px 10px",
                        borderRadius: "6px",
                        border: "1px solid #cbd5e1",
                        background: item.nr_ex <= 1 ? "#f1f5f9" : "#ffffff",
                        cursor: item.nr_ex <= 1 ? "not-allowed" : "pointer",
                        fontWeight: "600"
                      }}
                    >
                      −
                    </button>
                  </div>
                  <button
                    onClick={() => removeItem(item.codcar)}
                    style={{ background: "#fee2e2", color: "#dc2626", border: "none", padding: "6px 12px", borderRadius: "6px", cursor: "pointer", fontWeight: "600" }}
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div style={{ marginTop: "24px", background: "#f8fafc", padding: "20px", borderRadius: "8px", display: "flex", justifyContent: "space-between", alignItems: "center", border: "1px solid #e2e8f0" }}>
            <h3 style={{ margin: 0, color: "#0f172a" }}>Total: {totalPrice.toFixed(2)} lei</h3>
            <button
              type="button"
              onClick={handleCheckout}
              disabled={checkingOut}
              className="details-btn"
              style={{
                padding: "10px 20px",
                fontSize: "15px",
                cursor: checkingOut ? "not-allowed" : "pointer",
                opacity: checkingOut ? 0.7 : 1
              }}
            >
              {checkingOut ? "Processing..." : "Proceed to Checkout"}
            </button>
          </div>
        </div>
      )}
    </main>
  );
}