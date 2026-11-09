import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Navbar() {
  const { user, logout } = useAuth();

  return (
    <header className="header">
      <Link className="logo" to="/">
        Librărie
      </Link>

      <nav style={{ display: "flex", gap: "16px", alignItems: "center" }}>
        <Link to="/">Cărțile noastre</Link>

        {user ? (
          <>
            <span style={{ fontSize: "14px", color: "#4b5563" }}>
              Salut, <strong>{user.nume}</strong> {user.admin ? "(Admin)" : ""}
            </span>
            <button
              onClick={logout}
              style={{
                background: "#ef4444",
                color: "white",
                border: "none",
                padding: "6px 12px",
                borderRadius: "6px",
                cursor: "pointer"
              }}
            >
              Deconectare
            </button>
          </>
        ) : (
          <>
            <Link to="/login">Conectează-te</Link>
            <Link to="/register" style={{ background: "#2563eb", color: "white", padding: "6px 12px", borderRadius: "6px" }}>
              Înregistrare
            </Link>
          </>
        )}
      </nav>
    </header>
  );
}