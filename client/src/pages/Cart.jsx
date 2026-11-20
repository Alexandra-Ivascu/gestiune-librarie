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

  if (loading) return <main className="main cart-main"><p>Loading cart...</p></main>;
  if (error) return <main className="main cart-main"><p className="error">{error}</p></main>;

  return (
    <main className="main cart-main">
      <h2>Shopping Cart</h2>

      {checkoutSuccess && (
        <div className="cart-success">
          {checkoutSuccess}
        </div>
      )}

      {cartItems.length === 0 ? (
        <div className="empty cart-empty">
          <h3>Your cart is empty</h3>
          <p>Explore our catalog and find something you love!</p>
          <Link
            to="/"
            onClick={() => setCheckoutSuccess("")}
            className="details-btn cart-browse-btn"
          >
            Browse Catalog
          </Link>
        </div>
      ) : (
        <div>
          <div className="cart-items-list">
            {cartItems.map((item) => (
              <div key={item.codcar} className="cart-item-card">
                <div className="cart-item-info">
                  <h4 className="cart-item-title">
                    <Link to={`/book/${item.codcar}`}>
                      {item.titlu}
                    </Link>
                  </h4>

                  <span className="cart-item-meta">
                    {item.editura} · {item.limba} | Price: {Number(item.pret).toFixed(2)} lei × {item.nr_ex}
                  </span>
                </div>

                <div className="cart-item-controls">
                  <strong className="cart-item-subtotal">
                    {(Number(item.pret) * item.nr_ex).toFixed(2)} lei
                  </strong>

                  <div className="cart-qty-group">
                    <span className="cart-qty-label">
                      Copies: {item.nr_ex}
                    </span>
                    <button
                      type="button"
                      onClick={() => updateQuantity(item.codcar, item.nr_ex + 1)}
                      disabled={item.nr_ex >= item.stoc}
                      title={item.nr_ex >= item.stoc ? "Max stock reached" : "Increase copies"}
                      className="cart-qty-btn"
                    >
                      +
                    </button>
                    <button
                      type="button"
                      onClick={() => updateQuantity(item.codcar, item.nr_ex - 1)}
                      disabled={item.nr_ex <= 1}
                      title={item.nr_ex <= 1 ? "Minimum is 1 copy (use Remove to delete)" : "Decrease copies"}
                      className="cart-qty-btn"
                    >
                      −
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => removeItem(item.codcar)}
                    className="cart-remove-btn"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="cart-summary-bar">
            <h3 className="cart-total-text">Total: {totalPrice.toFixed(2)} lei</h3>
            <button
              type="button"
              onClick={handleCheckout}
              disabled={checkingOut}
              className="details-btn cart-checkout-btn"
            >
              {checkingOut ? "Processing..." : "Proceed to Checkout"}
            </button>
          </div>
        </div>
      )}
    </main>
  );
}