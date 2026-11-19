import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Navbar() {
  const { user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  const closeMenu = () => setMenuOpen(false);

  const handleLogout = () => {
    logout();
    closeMenu();
  };

  return (
    <header className="header">
      <Link className="logo" to="/" onClick={closeMenu}>
        Bookstore
      </Link>

      <button
        className="hamburger"
        onClick={() => setMenuOpen(!menuOpen)}
        aria-label="Toggle navigation menu"
        aria-expanded={menuOpen}
      >
        {menuOpen ? "✕" : "☰"}
      </button>

      <nav className={`nav-links ${menuOpen ? "active" : ""}`}>
        <a href="/#catalog" onClick={closeMenu}>
          Catalog
        </a>
        <Link to="/shelf" className="nav-link">
        Virtual Shelf
        </Link>

        <Link to="/autori" onClick={closeMenu}>
          Discover authors
        </Link>

        {user?.role === "client" && (
          <Link to="/cart" onClick={closeMenu}>
            Cart
          </Link>
        )}
        {user?.role === "angajat" && <Link to="/admin" onClick={closeMenu}>Staff/Admin Panel</Link>}
        {user?.role === "angajat" && user?.admin && (
           <Link to="/admin/reports" onClick={closeMenu}>Reports &amp; Stats</Link>
        )}

        {user ? (
          <>
            <Link className="my-account-btn" to="/my-account" onClick={closeMenu}>
              My Account
            </Link>
            <button type="button" className="logout-btn" onClick={handleLogout}>
              Log out
            </button>
          </>
        ) : (
          <Link className="login-btn" to="/login" onClick={closeMenu}>
            Log in
          </Link>
        )}
      </nav>
    </header>
  );
}