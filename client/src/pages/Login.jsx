import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Login() {
  const [email, setEmail] = useState("");
  const [parola, setParola] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await login(email, parola);
      navigate("/");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: "400px", margin: "40px auto", padding: "24px", background: "white", borderRadius: "12px", border: "1px solid #e5e7eb" }}>
      <h2>Conectare</h2>
      {error && <p style={{ color: "#ef4444", fontSize: "14px" }}>{error}</p>}
      
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "14px", marginTop: "16px" }}>
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          style={{ padding: "10px", borderRadius: "6px", border: "1px solid #d1d5db" }}
        />
        <input
          type="password"
          placeholder="Parolă"
          value={parola}
          onChange={(e) => setParola(e.target.value)}
          required
          style={{ padding: "10px", borderRadius: "6px", border: "1px solid #d1d5db" }}
        />
        <button
          type="submit"
          disabled={loading}
          style={{ padding: "10px", background: "#2563eb", color: "white", border: "none", borderRadius: "6px", cursor: "pointer" }}
        >
          {loading.toString() === "true" || loading ? "Se conectează..." : "Conectare"}
        </button>
      </form>
      <p style={{ marginTop: "16px", fontSize: "14px" }}>
        Nu ai cont? <Link to="/register">Înregistrează-te</Link>
      </p>
    </div>
  );
}