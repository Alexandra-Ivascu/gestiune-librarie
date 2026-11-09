import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Register() {
  const [formData, setFormData] = useState({
    nume: "",
    prenume: "",
    email: "",
    parola: ""
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const { register } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (formData.parola.length < 12) {
      setError("Parola trebuie să conțină cel puțin 12 caractere.");
      return;
    }

    setLoading(true);

    try {
      await register(formData.nume, formData.prenume, formData.email, formData.parola);
      setSuccess("Cont creat cu succes! Redirecționare către autentificare...");
      setTimeout(() => navigate("/login"), 2000);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: "400px", margin: "40px auto", padding: "24px", background: "white", borderRadius: "12px", border: "1px solid #e5e7eb" }}>
      <h2>Înregistrare cont</h2>
      {error && <p style={{ color: "#ef4444", fontSize: "14px" }}>{error}</p>}
      {success && <p style={{ color: "#10b981", fontSize: "14px" }}>{success}</p>}

      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "14px", marginTop: "16px" }}>
        <input
          type="text"
          name="nume"
          placeholder="Nume"
          value={formData.nume}
          onChange={handleChange}
          required
          style={{ padding: "10px", borderRadius: "6px", border: "1px solid #d1d5db" }}
        />
        <input
          type="text"
          name="prenume"
          placeholder="Prenume"
          value={formData.prenume}
          onChange={handleChange}
          required
          style={{ padding: "10px", borderRadius: "6px", border: "1px solid #d1d5db" }}
        />
        <input
          type="email"
          name="email"
          placeholder="Email"
          value={formData.email}
          onChange={handleChange}
          required
          style={{ padding: "10px", borderRadius: "6px", border: "1px solid #d1d5db" }}
        />
        <input
          type="password"
          name="parola"
          placeholder="Parolă (min. 12 caractere)"
          value={formData.parola}
          onChange={handleChange}
          required
          style={{ padding: "10px", borderRadius: "6px", border: "1px solid #d1d5db" }}
        />
        <button
          type="submit"
          disabled={loading}
          style={{ padding: "10px", background: "#2563eb", color: "white", border: "none", borderRadius: "6px", cursor: "pointer" }}
        >
          {loading ? "Se înregistrează..." : "Înregistrează-te"}
        </button>
      </form>
      <p style={{ marginTop: "16px", fontSize: "14px" }}>
        Ai deja cont? <Link to="/login">Conectează-te</Link>
      </p>
    </div>
  );
}