const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const pool = require("./db");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    credentials: true
}));

app.use(express.json());
app.use(cookieParser());

const authRoutes = require("./routes/auth");
const authenticateToken = require("./middleware/authMiddleware");

app.use("/api/auth", authRoutes);



app.get("/api/health", async(req,res)=>{
    try{
        const result=await pool.query(
            "SELECT current_database() AS database"
        );
    res.json({
        status: "ok",
        message: "API librarie si baza de date conectate",
        database: result.rows[0].database
    });
    } catch(error){
        console.error("Eroare conexiune baza de date", error.message);
        res.status(500).json({
            status: "error",
            message: "nu s-a putut realiza conexiunea cu baza de date"
        });
    }
});


app.get("/api/books", async (req, res) => {
  try {
    const { titlu, autor, limba, editura, gen, maxPret, stoc } = req.query;

    let query = `
      SELECT
        c.codcar,
        c.titlu,
        c.pret,
        c.stoc,
        c.data_publicare,
        c.limba,
        c.editura,
        COALESCE((SELECT ROUND(AVG(r.nota)::numeric, 1) FROM rating r WHERE r.codcar = c.codcar), 0) AS avg_rating,
        (SELECT COUNT(*)::int FROM rating r WHERE r.codcar = c.codcar) AS rating_count,
        COALESCE(
          (SELECT json_agg(json_build_object('coda', a.coda, 'nume', a.nume))
           FROM carte_autor ca
           JOIN autor a ON ca.coda = a.coda
           WHERE ca.codcar = c.codcar),
          '[]'
        ) AS autori,
        COALESCE(
          (SELECT json_agg(json_build_object('codg', g.codg, 'denumire', g.denumire))
           FROM carte_gen cg
           JOIN gen g ON cg.codg = g.codg
           WHERE cg.codcar = c.codcar),
          '[]'
        ) AS genuri
      FROM carte c
      WHERE 1=1
    `;

    const values = [];
    let index = 1;

    if (titlu) {
      query += ` AND c.titlu ILIKE $${index}`;
      values.push(`%${titlu}%`);
      index++;
    }

    if (autor) {
      query += ` AND EXISTS (
        SELECT 1
        FROM carte_autor ca
        JOIN autor a ON ca.coda = a.coda
        WHERE ca.codcar = c.codcar AND a.nume ILIKE $${index}
      )`;
      values.push(`%${autor}%`);
      index++;
    }

    if (limba) {
      query += ` AND c.limba ILIKE $${index}`;
      values.push(limba);
      index++;
    }

    if (editura) {
      query += ` AND c.editura ILIKE $${index}`;
      values.push(editura);
      index++;
    }

    if (gen) {
      query += ` AND EXISTS (
        SELECT 1
        FROM carte_gen cg
        JOIN gen g ON cg.codg = g.codg
        WHERE cg.codcar = c.codcar AND g.denumire ILIKE $${index}
      )`;
      values.push(gen);
      index++;
    }

    if (maxPret !== undefined && maxPret !== "") {
      query += ` AND c.pret <= $${index}`;
      values.push(maxPret);
      index++;
    }

    if (stoc === "true") {
      query += ` AND c.stoc > 0`;
    }

    const result = await pool.query(query, values);
    res.json(result.rows);

  } catch (error) {
    console.error("Could not retrieve books:", error.message);
    res.status(500).json({ message: "Could not retrieve books" });
  }
});

app.get("/api/books/filters", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        ARRAY(
          SELECT DISTINCT limba
          FROM carte
          ORDER BY limba
        ) AS languages,

        ARRAY(
          SELECT DISTINCT editura
          FROM carte
          ORDER BY editura
        ) AS publishers,

        ARRAY(
          SELECT DISTINCT denumire
          FROM gen
          ORDER BY denumire
        ) AS genres
    `);

    res.json(result.rows[0]);

  } catch (error) {
    console.error("Could not retrieve filters:", error.message);
    res.status(500).json({
      message: "Could not retrieve filter options"
    });
  }
});


app.get("/api/books/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const result = await pool.query(
      `SELECT
        c.*,
        COALESCE((SELECT ROUND(AVG(r.nota)::numeric, 1) FROM rating r WHERE r.codcar = c.codcar), 0) AS avg_rating,
        (SELECT COUNT(*)::int FROM rating r WHERE r.codcar = c.codcar) AS rating_count,
        COALESCE(
          (SELECT json_agg(json_build_object('coda', a.coda, 'nume', a.nume))
           FROM carte_autor ca
           JOIN autor a ON ca.coda = a.coda
           WHERE ca.codcar = c.codcar),
          '[]'
        ) AS autori,
        COALESCE(
          (SELECT json_agg(json_build_object('codg', g.codg, 'denumire', g.denumire))
           FROM carte_gen cg
           JOIN gen g ON cg.codg = g.codg
           WHERE cg.codcar = c.codcar),
          '[]'
        ) AS genuri
      FROM carte c
      WHERE c.codcar = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "Book not found"
      });
    }

    res.json(result.rows[0]);

  } catch (error) {
    console.error(error.message);
    res.status(500).json({
      message: "Could not retrieve book"
    });
  }
});

app.post("/api/books", async (req, res) => {
    try {
        const {
            titlu,
            isbn,
            descriere,
            pret,
            stoc,
            data_publicare,
            limba,
            editura,
            nr_pag
        } = req.body;

        // Check required fields
        if (!titlu || !isbn || !limba || !editura) {
            return res.status(400).json({
                message: "Missing required fields"
            });
        }

        // Validate numerical values
        if (
            !Number.isFinite(Number(pret)) ||
            Number(pret) < 0 ||
            !Number.isInteger(Number(stoc)) ||
            Number(stoc) < 0 ||
            !Number.isInteger(Number(nr_pag)) ||
            Number(nr_pag) <= 0
        ) {
            return res.status(400).json({
                message: "Invalid numeric values"
            });
        }

        const result = await pool.query(
            `INSERT INTO carte (
                titlu, isbn, descriere, pret, stoc,
                data_publicare, limba, editura, nr_pag
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            RETURNING *`,
            [
                titlu,
                isbn,
                descriere,
                pret,
                stoc,
                data_publicare,
                limba,
                editura,
                nr_pag
            ]
        );

        res.status(201).json(result.rows[0]);

    } catch (error) {
        console.error("Could not create book:", error.message);

        res.status(500).json({
            message: "Could not create book"
        });
    }
});

app.get("/api/my-account", authenticateToken, async (req, res) => {
    try {
        const { id, role } = req.user;
        let query = "";
        if (role === 'client') {
            query = `SELECT codcli AS id, nume, prenume, email, 'client' AS role, FALSE AS admin FROM client WHERE codcli = $1`;
        } else {
            query = `SELECT codang AS id, nume, prenume, email, 'angajat' AS role, admin FROM angajat WHERE codang = $1`;
        }
        const result = await pool.query(query, [id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ message: "User not found" });
        }
        res.json({ user: result.rows[0] });
    } catch (error) {
        res.status(500).json({ message: "Server error" });
    }
});

app.get("/api/authors", async (req, res) => {
  try {
    const { search } = req.query;

    let query = `
      SELECT
        a.coda,
        a.nume,
        a.biografie,
        COALESCE(
          (SELECT json_agg(
            json_build_object(
              'codcar', c.codcar,
              'titlu', c.titlu,
              'pret', c.pret,
              'stoc', c.stoc,
              'editura', c.editura,
              'limba', c.limba
            )
          )
          FROM carte_autor ca
          JOIN carte c ON ca.codcar = c.codcar
          WHERE ca.coda = a.coda),
          '[]'
        ) AS carti
      FROM autor a
      WHERE 1=1
    `;

    const values = [];
    if (search && search.trim() !== "") {
      query += ` AND a.nume ILIKE $1`;
      values.push(`%${search.trim()}%`);
    }

    query += ` ORDER BY a.nume ASC`;

    const result = await pool.query(query, values);
    res.json(result.rows);
  } catch (error) {
    console.error("Could not retrieve authors:", error.message);
    res.status(500).json({ message: "Could not retrieve authors" });
  }
});



app.get("/api/cart", authenticateToken, async (req, res) => {
    try {
        const codcli = req.user.id; 
        const query = `
            SELECT c.codcar, c.nr_ex, c.data_adaugare, carte.titlu, carte.pret, carte.stoc, carte.editura, carte.limba
            FROM cos c
            JOIN carte ON c.codcar = carte.codcar
            WHERE c.codcli = $1;
        `;
        const result = await pool.query(query, [codcli]);
        res.json(result.rows);
    } catch (err) {
        console.error("Fetch cart error:", err.message);
        res.status(500).json({ message: "Server error fetching cart" });
    }
});


app.post("/api/cart", authenticateToken, async (req, res) => {
    try {
        const codcli = req.user.id;
        const { codcar, nr_ex = 1 } = req.body;

        if (!codcar || nr_ex <= 0) {
            return res.status(400).json({ message: "Invalid book or quantity" });
        }

    
        const existing = await pool.query(
            "SELECT nr_ex FROM cos WHERE codcli = $1 AND codcar = $2",
            [codcli, codcar]
        );

        if (existing.rows.length > 0) {
            const newQty = existing.rows[0].nr_ex + Number(nr_ex);
            await pool.query(
                "UPDATE cos SET nr_ex = $1 WHERE codcli = $2 AND codcar = $3",
                [newQty, codcli, codcar]
            );
        } else {
            await pool.query(
                "INSERT INTO cos (codcli, codcar, nr_ex) VALUES ($1, $2, $3)",
                [codcli, codcar, nr_ex]
            );
        }

        res.status(200).json({ message: "Cart updated successfully" });
    } catch (err) {
        console.error("Add to cart error:", err.message);
        res.status(500).json({ message: "Server error updating cart" });
    }
});

app.delete("/api/cart/:codcar", authenticateToken, async (req, res) => {
    try {
        const codcli = req.user.id;
        const { codcar } = req.params;

    await pool.query(
            "DELETE FROM cos WHERE codcli = $1 AND codcar = $2",
            [codcli, codcar]
        );
        res.status(200).json({ message: "Item removed from cart" });
    } catch (err) {
        console.error("Remove from cart error:", err.message);
        res.status(500).json({ message: "Server error removing item" });
    }
});

// Update quantity (nr_ex) for an item in the logged-in client's cart
app.patch("/api/cart/:codcar", authenticateToken, async (req, res) => {
  try {
    const codcli = req.user.id;
    const { codcar } = req.params;
    const { nr_ex } = req.body;

    const nextQty = Number(nr_ex);
    if (!Number.isInteger(nextQty) || nextQty < 1) {
      return res.status(400).json({ message: "Quantity must be at least 1" });
    }

    const bookResult = await pool.query(
      "SELECT stoc FROM carte WHERE codcar = $1",
      [codcar]
    );

    if (bookResult.rows.length === 0) {
      return res.status(404).json({ message: "Book not found" });
    }

    if (nextQty > bookResult.rows[0].stoc) {
      return res.status(400).json({
        message: `Only ${bookResult.rows[0].stoc} copies available in stock`
      });
    }

    const updated = await pool.query(
      `UPDATE cos
       SET nr_ex = $1
       WHERE codcli = $2 AND codcar = $3
       RETURNING codcar, nr_ex`,
      [nextQty, codcli, codcar]
    );

    if (updated.rows.length === 0) {
      return res.status(404).json({ message: "Item not found in cart" });
    }

    res.json(updated.rows[0]);
  } catch (err) {
    console.error("Update cart quantity error:", err.message);
    res.status(500).json({ message: "Server error updating quantity" });
  }
});

// Get saved book IDs for the logged-in client
app.get("/api/saved/ids", authenticateToken, async (req, res) => {
  try {
    const codcli = req.user.id;
    const result = await pool.query(
      "SELECT codcar FROM salvare WHERE codcli = $1",
      [codcli]
    );
    res.json(result.rows.map((row) => row.codcar));
  } catch (err) {
    console.error("Fetch saved IDs error:", err.message);
    res.status(500).json({ message: "Server error fetching saved books" });
  }
});

// Save a book for the logged-in client
app.post("/api/saved", authenticateToken, async (req, res) => {
  try {
    const codcli = req.user.id;
    const { codcar } = req.body;

    if (!codcar) {
      return res.status(400).json({ message: "Book ID is required" });
    }

    await pool.query(
      `INSERT INTO salvare (codcli, codcar)
       VALUES ($1, $2)
       ON CONFLICT (codcli, codcar) DO NOTHING`,
      [codcli, codcar]
    );

    res.status(200).json({ message: "Book saved", codcar });
  } catch (err) {
    console.error("Save book error:", err.message);
    res.status(500).json({ message: "Server error saving book" });
  }
});

// Unsave (remove from salvare) a book for the logged-in client
app.delete("/api/saved/:codcar", authenticateToken, async (req, res) => {
  try {
    const codcli = req.user.id;
    const { codcar } = req.params;

    await pool.query(
      "DELETE FROM salvare WHERE codcli = $1 AND codcar = $2",
      [codcli, codcar]
    );

    res.status(200).json({ message: "Book removed from saved", codcar: Number(codcar) });
  } catch (err) {
    console.error("Unsave book error:", err.message);
    res.status(500).json({ message: "Server error removing saved book" });
  }
});

// Checkout: move items from cos -> vanzare, decrement carte.stoc, and clear cos
app.post("/api/cart/checkout", authenticateToken, async (req, res) => {
  const client = await pool.connect();

  try {
    const codcli = req.user.id;

    if (req.user.role !== "client") {
      return res.status(403).json({ message: "Only clients can place orders" });
    }

    await client.query("BEGIN");

    // Lock cart rows and current book stock so concurrent checkouts cannot oversell
    const cartResult = await client.query(
      `SELECT c.codcar, c.nr_ex, carte.titlu, carte.pret, carte.stoc
       FROM cos c
       JOIN carte ON c.codcar = carte.codcar
       WHERE c.codcli = $1
       FOR UPDATE OF carte`,
      [codcli]
    );

    if (cartResult.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(400).json({ message: "Your cart is empty" });
    }

    // Verify stock for every item before modifying data
    for (const item of cartResult.rows) {
      if (item.stoc < item.nr_ex) {
        await client.query("ROLLBACK");
        return res.status(400).json({
          message: `Insufficient stock for "${item.titlu}". Available: ${item.stoc}, requested: ${item.nr_ex}`
        });
      }
    }

    let totalPaid = 0;

    for (const item of cartResult.rows) {
      await client.query(
        `INSERT INTO vanzare (codcli, codcar, codang, nr_ex)
         VALUES ($1, $2, NULL, $3)`,
        [codcli, item.codcar, item.nr_ex]
      );

      await client.query(
        `UPDATE carte
         SET stoc = stoc - $1
         WHERE codcar = $2`,
        [item.nr_ex, item.codcar]
      );

      totalPaid += Number(item.pret) * item.nr_ex;
    }

    await client.query("DELETE FROM cos WHERE codcli = $1", [codcli]);

    await client.query("COMMIT");

    res.status(200).json({
      message: "Order placed successfully",
      itemsPurchased: cartResult.rows.length,
      total: Number(totalPaid.toFixed(2))
    });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Checkout error:", err.message);
    res.status(500).json({ message: "Checkout failed. Please try again." });
  } finally {
    client.release();
  }
});

// Get saved books for the logged-in client
app.get("/api/saved", authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== "client") {
      return res.status(403).json({ message: "Only clients have saved books" });
    }

    const codcli = req.user.id;
    const query = `
      SELECT
        s.codcar,
        s.data_salvare,
        carte.titlu,
        carte.pret,
        carte.stoc,
        carte.editura,
        carte.limba
      FROM salvare s
      JOIN carte ON s.codcar = carte.codcar
      WHERE s.codcli = $1
      ORDER BY s.data_salvare DESC;
    `;
    const result = await pool.query(query, [codcli]);
    res.json(result.rows);
  } catch (err) {
    console.error("Fetch saved books error:", err.message);
    res.status(500).json({ message: "Server error fetching saved books" });
  }
});

// Get order history (vanzare) for the logged-in client
app.get("/api/orders", authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== "client") {
      return res.status(403).json({ message: "Only clients have order history" });
    }

    const codcli = req.user.id;
    const query = `
      SELECT
        ROW_NUMBER() OVER (ORDER BY v.data_vanzare DESC, v.codcar ASC) AS order_row_id,
        v.codcar,
        v.nr_ex,
        v.data_vanzare,
        carte.titlu,
        carte.pret,
        carte.editura,
        carte.limba,
        (carte.pret * v.nr_ex) AS subtotal
      FROM vanzare v
      JOIN carte ON v.codcar = carte.codcar
      WHERE v.codcli = $1
      ORDER BY v.data_vanzare DESC, v.codcar ASC;
    `;
    const result = await pool.query(query, [codcli]);
    res.json(result.rows);
  } catch (err) {
    console.error("Fetch orders error:", err.message);
    res.status(500).json({ message: "Server error fetching order history" });
  }
});

// Get current logged-in client's rating for a specific book
app.get("/api/books/:id/my-rating", authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== "client") {
      return res.json({ nota: null });
    }

    const codcli = req.user.id;
    const codcar = req.params.id;

    const result = await pool.query(
      "SELECT nota FROM rating WHERE codcli = $1 AND codcar = $2",
      [codcli, codcar]
    );

    res.json({ nota: result.rows[0]?.nota ?? null });
  } catch (err) {
    console.error("Fetch user rating error:", err.message);
    res.status(500).json({ message: "Server error fetching rating" });
  }
});

// Submit or update a rating (1-5) for a book
app.post("/api/books/:id/rating", authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== "client") {
      return res.status(403).json({ message: "Only clients can rate books" });
    }

    const codcli = req.user.id;
    const codcar = req.params.id;
    const nota = Number(req.body.nota);

    if (!Number.isInteger(nota) || nota < 1 || nota > 5) {
      return res.status(400).json({ message: "Rating must be an integer between 1 and 5" });
    }

    await pool.query(
      `INSERT INTO rating (codcli, codcar, nota, data_rating)
       VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
       ON CONFLICT (codcli, codcar)
       DO UPDATE SET nota = EXCLUDED.nota, data_rating = CURRENT_TIMESTAMP`,
      [codcli, codcar, nota]
    );

    const stats = await pool.query(
      `SELECT
         COALESCE(ROUND(AVG(nota)::numeric, 1), 0) AS avg_rating,
         COUNT(*)::int AS rating_count
       FROM rating
       WHERE codcar = $1`,
      [codcar]
    );

    res.status(200).json({
      message: "Rating saved",
      nota,
      avg_rating: stats.rows[0].avg_rating,
      rating_count: stats.rows[0].rating_count
    });
  } catch (err) {
    console.error("Save rating error:", err.message);
    res.status(500).json({ message: "Server error saving rating" });
  }
});




app.listen(PORT,()=>{
    console.log(`Server running at http://localhost:${PORT}`);

});