import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const API_URL = (
  import.meta.env.VITE_API_URL || "http://localhost:5000/api"
).replace(/\/$/, "");

export default function AdminReports() {
  const { user, loading: authLoading } = useAuth();

  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [exporting, setExporting] = useState("");

  const fetchReports = async (from = fromDate, to = toDate) => {
    try {
      setLoading(true);
      setError("");

      const params = new URLSearchParams();
      if (from) params.append("from", from);
      if (to) params.append("to", to);

      const res = await fetch(`${API_URL}/admin/reports?${params.toString()}`, {
        credentials: "include"
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data.message || "Could not load statistics and reports.");
      }

      setReport(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading && user?.role === "angajat" && user?.admin) {
      fetchReports();
    } else if (!authLoading) {
      setLoading(false);
    }
  }, [user, authLoading]);

  const handleApplyFilter = (e) => {
    e.preventDefault();
    fetchReports(fromDate, toDate);
  };

  const handleResetFilter = () => {
    setFromDate("");
    setToDate("");
    fetchReports("", "");
  };

  const handleDownloadCsv = async (type) => {
    try {
      setExporting(type);
      setError("");

      const params = new URLSearchParams({ type });
      if (type === "sales") {
        if (fromDate) params.append("from", fromDate);
        if (toDate) params.append("to", toDate);
      }

      const res = await fetch(`${API_URL}/admin/reports/export.csv?${params.toString()}`, {
        credentials: "include"
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || "CSV export failed.");
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${type}-report-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError(err.message);
    } finally {
      setExporting("");
    }
  };

  const handleExportPdf = () => {
    if (!report) return;

    const periodLabel =
      fromDate || toDate
        ? `${fromDate || "Beginning"} to ${toDate || "Present"}`
        : "All Time";

    const topBooksRows = report.topBooks
      .map(
        (b) => `
        <tr>
          <td>${b.titlu}</td>
          <td>${b.editura}</td>
          <td style="text-align:right">${b.units_sold}</td>
          <td style="text-align:right">${Number(b.revenue).toFixed(2)} RON</td>
          <td style="text-align:right">${b.stoc}</td>
        </tr>`
      )
      .join("");

    const salesRows = report.detailedSales
      .slice(0, 100)
      .map(
        (s) => `
        <tr>
          <td>${s.data_vanzare}</td>
          <td>${s.titlu}</td>
          <td style="text-align:right">${s.nr_ex}</td>
          <td style="text-align:right">${Number(s.unit_price).toFixed(2)}</td>
          <td style="text-align:right">${Number(s.subtotal).toFixed(2)} RON</td>
          <td>${s.client_email}</td>
          <td>${s.processed_by}</td>
        </tr>`
      )
      .join("");

    const printWindow = window.open("", "_blank", "width=1000,height=750");
    if (!printWindow) {
      setError("Please allow pop-ups in your browser to export the PDF report.");
      return;
    }

    printWindow.document.write(`
      <!doctype html>
      <html>
        <head>
          <title>Bookstore Report - ${new Date().toISOString().slice(0, 10)}</title>
          <style>
            body { font-family: Arial, sans-serif; color: #0f172a; padding: 28px; font-size: 12px; }
            h1 { margin: 0 0 4px; font-size: 22px; }
            .meta { color: #475569; margin-bottom: 20px; }
            .kpis { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 24px; }
            .kpi { border: 1px solid #cbd5e1; border-radius: 6px; padding: 10px 12px; }
            .kpi span { display: block; color: #64748b; font-size: 11px; text-transform: uppercase; }
            .kpi strong { font-size: 17px; }
            h2 { font-size: 15px; margin: 22px 0 8px; border-bottom: 1px solid #cbd5e1; padding-bottom: 4px; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
            th, td { border: 1px solid #e2e8f0; padding: 6px 8px; text-align: left; }
            th { background: #f1f5f9; font-weight: 700; }
            @media print { body { padding: 0; } }
          </style>
        </head>
        <body>
          <h1>Bookstore Sales &amp; Inventory Report</h1>
          <div class="meta">Period: ${periodLabel} &middot; Generated on ${new Date().toLocaleString("ro-RO")}</div>

          <div class="kpis">
            <div class="kpi"><span>Total Revenue</span><strong>${Number(report.kpis.revenue).toFixed(2)} RON</strong></div>
            <div class="kpi"><span>Copies Sold</span><strong>${report.kpis.units_sold}</strong></div>
            <div class="kpi"><span>Transactions</span><strong>${report.kpis.transactions}</strong></div>
            <div class="kpi"><span>Unique Clients</span><strong>${report.kpis.unique_clients}</strong></div>
          </div>

          <h2>Top-Selling Books</h2>
          <table>
            <thead>
              <tr>
                <th>Title</th>
                <th>Publisher</th>
                <th style="text-align:right">Copies Sold</th>
                <th style="text-align:right">Revenue</th>
                <th style="text-align:right">Current Stock</th>
              </tr>
            </thead>
            <tbody>${topBooksRows || '<tr><td colspan="5">No sales data</td></tr>'}</tbody>
          </table>

          <h2>Detailed Sales Log (up to 100 most recent)</h2>
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Title</th>
                <th style="text-align:right">Qty</th>
                <th style="text-align:right">Unit Price</th>
                <th style="text-align:right">Subtotal</th>
                <th>Client</th>
                <th>Processed By</th>
              </tr>
            </thead>
            <tbody>${salesRows || '<tr><td colspan="7">No transactions in selected period</td></tr>'}</tbody>
          </table>
        </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 250);
  };

  if (authLoading || loading) {
    return (
      <main className="main" style={{ padding: "36px" }}>
        <p>Loading statistics and reports...</p>
      </main>
    );
  }

  if (!user || user.role !== "angajat" || !user.admin) {
    return (
      <main className="main" style={{ padding: "36px" }}>
        <div className="empty">
          <h3>Admin Access Required</h3>
          <p>Only administrators can access store statistics and report exports.</p>
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

  const maxGenreRevenue =
    report?.genreSales?.reduce((max, g) => Math.max(max, Number(g.revenue)), 0) || 1;

  return (
    <main className="main" style={{ paddingTop: "36px", paddingBottom: "70px" }}>
      <div className="section-heading" style={{ flexWrap: "wrap" }}>
        <div>
          <h2>Statistics &amp; Reports</h2>
          <p style={{ color: "#64748b" }}>
            Sales performance, inventory health, and downloadable CSV / PDF reports
          </p>
        </div>

        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
          <Link
            to="/admin"
            style={{
              padding: "9px 14px",
              borderRadius: "6px",
              border: "1px solid #cbd5e1",
              background: "#fff",
              fontWeight: "600",
              fontSize: "14px"
            }}
          >
            ← Back to Operations Panel
          </Link>
          <button
            type="button"
            onClick={() => handleDownloadCsv("sales")}
            disabled={exporting === "sales"}
            style={{
              padding: "9px 14px",
              borderRadius: "6px",
              border: "none",
              background: "#059669",
              color: "#fff",
              fontWeight: "600",
              cursor: "pointer"
            }}
          >
            {exporting === "sales" ? "Exporting..." : "Export Sales CSV"}
          </button>
          <button
            type="button"
            onClick={() => handleDownloadCsv("inventory")}
            disabled={exporting === "inventory"}
            style={{
              padding: "9px 14px",
              borderRadius: "6px",
              border: "none",
              background: "#0284c7",
              color: "#fff",
              fontWeight: "600",
              cursor: "pointer"
            }}
          >
            {exporting === "inventory" ? "Exporting..." : "Export Inventory CSV"}
          </button>
          <button
            type="button"
            onClick={handleExportPdf}
            disabled={!report}
            style={{
              padding: "9px 14px",
              borderRadius: "6px",
              border: "none",
              background: "#1e293b",
              color: "#fff",
              fontWeight: "600",
              cursor: "pointer"
            }}
          >
            Export PDF Report
          </button>
        </div>
      </div>

      {/* Date Range Filter */}
      <form
        onSubmit={handleApplyFilter}
        style={{
          ...cardStyle,
          display: "flex",
          gap: "12px",
          flexWrap: "wrap",
          alignItems: "flex-end"
        }}
      >
        <div>
          <label style={{ display: "block", fontSize: "12px", color: "#64748b", marginBottom: "4px" }}>
            From Date
          </label>
          <input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            style={{ padding: "8px 10px", border: "1px solid #cbd5e1", borderRadius: "6px" }}
          />
        </div>

        <div>
          <label style={{ display: "block", fontSize: "12px", color: "#64748b", marginBottom: "4px" }}>
            To Date
          </label>
          <input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            style={{ padding: "8px 10px", border: "1px solid #cbd5e1", borderRadius: "6px" }}
          />
        </div>

        <button
          type="submit"
          className="details-btn"
          style={{ border: "none", padding: "9px 16px", cursor: "pointer" }}
        >
          Filter Period
        </button>

        {(fromDate || toDate) && (
          <button
            type="button"
            onClick={handleResetFilter}
            style={{
              padding: "9px 14px",
              borderRadius: "6px",
              border: "1px solid #cbd5e1",
              background: "#f8fafc",
              cursor: "pointer"
            }}
          >
            Reset
          </button>
        )}
      </form>

      {error && (
        <div
          style={{
            marginTop: "16px",
            padding: "12px 16px",
            borderRadius: "8px",
            background: "#fef2f2",
            border: "1px solid #ef4444",
            color: "#991b1b",
            fontWeight: "600"
          }}
        >
          {error}
        </div>
      )}

      {report && (
        <>
          {/* KPI Summary Cards */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
              gap: "16px",
              marginTop: "20px"
            }}
          >
            <div style={{ ...cardStyle, marginTop: 0 }}>
              <span style={{ fontSize: "12px", color: "#64748b", textTransform: "uppercase" }}>
                Total Revenue
              </span>
              <div style={{ fontSize: "24px", fontWeight: "700", color: "#0f172a", marginTop: "6px" }}>
                {Number(report.kpis.revenue).toFixed(2)} lei
              </div>
            </div>

            <div style={{ ...cardStyle, marginTop: 0 }}>
              <span style={{ fontSize: "12px", color: "#64748b", textTransform: "uppercase" }}>
                Copies Sold
              </span>
              <div style={{ fontSize: "24px", fontWeight: "700", color: "#0f172a", marginTop: "6px" }}>
                {report.kpis.units_sold}
              </div>
            </div>

            <div style={{ ...cardStyle, marginTop: 0 }}>
              <span style={{ fontSize: "12px", color: "#64748b", textTransform: "uppercase" }}>
                Sale Line Items
              </span>
              <div style={{ fontSize: "24px", fontWeight: "700", color: "#0f172a", marginTop: "6px" }}>
                {report.kpis.transactions}
              </div>
            </div>

            <div style={{ ...cardStyle, marginTop: 0 }}>
              <span style={{ fontSize: "12px", color: "#64748b", textTransform: "uppercase" }}>
                Unique Registered Buyers
              </span>
              <div style={{ fontSize: "24px", fontWeight: "700", color: "#0f172a", marginTop: "6px" }}>
                {report.kpis.unique_clients}
              </div>
            </div>
          </div>

          {/* Revenue by Genre */}
          <section style={cardStyle}>
            <h3 style={{ marginTop: 0 }}>Revenue by Genre</h3>
            {report.genreSales.length === 0 ? (
              <p style={{ color: "#64748b" }}>No genre sales data for this period.</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                {report.genreSales.map((g) => {
                  const pct = Math.round((Number(g.revenue) / maxGenreRevenue) * 100);
                  return (
                    <div key={g.genre}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "14px", marginBottom: "4px" }}>
                        <strong>{g.genre}</strong>
                        <span>
                          {Number(g.revenue).toFixed(2)} lei ({g.units_sold} copies)
                        </span>
                      </div>
                      <div style={{ background: "#f1f5f9", borderRadius: "6px", height: "10px", overflow: "hidden" }}>
                        <div style={{ width: `${pct}%`, background: "#2563eb", height: "100%" }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* Top-Selling Books */}
          <section style={cardStyle}>
            <h3 style={{ marginTop: 0 }}>Top-Selling Books</h3>
            {report.topBooks.length === 0 ? (
              <p style={{ color: "#64748b" }}>No sales recorded in this period.</p>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "14px" }}>
                  <thead>
                    <tr style={{ borderBottom: "2px solid #e2e8f0", textAlign: "left" }}>
                      <th style={{ padding: "10px" }}>Book</th>
                      <th style={{ padding: "10px" }}>Publisher</th>
                      <th style={{ padding: "10px" }}>Copies Sold</th>
                      <th style={{ padding: "10px" }}>Revenue</th>
                      <th style={{ padding: "10px" }}>Remaining Stock</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.topBooks.map((b) => (
                      <tr key={b.codcar} style={{ borderBottom: "1px solid #f1f5f9" }}>
                        <td style={{ padding: "10px", fontWeight: "600" }}>
                          <Link to={`/book/${b.codcar}`}>{b.titlu}</Link>
                        </td>
                        <td style={{ padding: "10px", color: "#64748b" }}>{b.editura}</td>
                        <td style={{ padding: "10px" }}>{b.units_sold}</td>
                        <td style={{ padding: "10px", fontWeight: "600" }}>{Number(b.revenue).toFixed(2)} lei</td>
                        <td style={{ padding: "10px", color: b.stoc <= 5 ? "#dc2626" : "#059669" }}>
                          {b.stoc}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* Low Stock Alerts & Daily Sales Side by Side */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "16px" }}>
            <section style={cardStyle}>
              <h3 style={{ marginTop: 0 }}>Low-Stock Alerts (≤ 5 copies)</h3>
              {report.lowStock.length === 0 ? (
                <p style={{ color: "#059669" }}>All titles have healthy stock levels.</p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  {report.lowStock.map((b) => (
                    <div
                      key={b.codcar}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        padding: "8px 12px",
                        background: b.stoc === 0 ? "#fef2f2" : "#fffbeb",
                        borderRadius: "6px",
                        fontSize: "13px"
                      }}
                    >
                      <Link to={`/book/${b.codcar}`} style={{ fontWeight: "600" }}>
                        {b.titlu}
                      </Link>
                      <strong style={{ color: b.stoc === 0 ? "#dc2626" : "#b45309" }}>
                        {b.stoc === 0 ? "Out of stock" : `${b.stoc} left`}
                      </strong>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section style={cardStyle}>
              <h3 style={{ marginTop: 0 }}>Daily Sales Summary</h3>
              {report.dailySales.length === 0 ? (
                <p style={{ color: "#64748b" }}>No daily sales in this period.</p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  {report.dailySales.map((d) => (
                    <div
                      key={d.sale_date}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        padding: "8px 12px",
                        background: "#f8fafc",
                        borderRadius: "6px",
                        fontSize: "13px"
                      }}
                    >
                      <span>
                        <strong>{d.sale_date}</strong> · {d.units_sold} copies
                      </span>
                      <strong>{Number(d.revenue).toFixed(2)} lei</strong>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        </>
      )}
    </main>
  );
}