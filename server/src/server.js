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
const bcrypt = require("bcrypt");

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

// Staff / Admin authorization helpers
function requireStaff(req, res, next) {
  if (!req.user || req.user.role !== "angajat") {
    return res.status(403).json({ message: "Staff access required" });
  }
  next();
}

async function requireAdmin(req, res, next) {
  try {
    if (!req.user || req.user.role !== "angajat") {
      return res.status(403).json({ message: "Admin access required" });
    }

    const result = await pool.query(
      "SELECT admin FROM angajat WHERE codang = $1",
      [req.user.id]
    );

    if (result.rows.length === 0 || !result.rows[0].admin) {
      return res.status(403).json({ message: "Admin access required" });
    }

    req.user.admin = true;
    next();
  } catch (error) {
    console.error("Admin check error:", error.message);
    res.status(500).json({ message: "Server error verifying admin status" });
  }
}

// Get authors, genres, and staff list for the admin panel
app.get("/api/admin/options", authenticateToken, requireStaff, async (req, res) => {
  try {
    const staffCheck = await pool.query(
      "SELECT admin FROM angajat WHERE codang = $1",
      [req.user.id]
    );
    const isDbAdmin = Boolean(staffCheck.rows[0]?.admin);

    const [authorsRes, genresRes, staffRes, salesRes] = await Promise.all([
      pool.query("SELECT coda, nume, biografie FROM autor ORDER BY nume ASC"),
      pool.query("SELECT codg, denumire FROM gen ORDER BY denumire ASC"),
      isDbAdmin
        ? pool.query("SELECT codang, nume, prenume, email, admin FROM angajat ORDER BY codang ASC")
        : Promise.resolve({ rows: [] }),
      pool.query(`
        SELECT
          v.codcar,
          v.codcli,
          v.codang,
          v.nr_ex,
          v.data_vanzare,
          c.titlu,
          c.pret,
          (c.pret * v.nr_ex) AS subtotal,
          cl.email AS client_email
        FROM vanzare v
        JOIN carte c ON v.codcar = c.codcar
        LEFT JOIN client cl ON v.codcli = cl.codcli
        ORDER BY v.data_vanzare DESC
        LIMIT 50
      `)
    ]);

    res.json({
      authors: authorsRes.rows,
      genres: genresRes.rows,
      staff: staffRes.rows,
      recentSales: salesRes.rows
    });
  } catch (error) {
    console.error("Admin options error:", error.message);
    res.status(500).json({ message: "Could not load admin data" });
  }
});

// Create a book with optional author IDs and genre IDs
app.post("/api/admin/books", authenticateToken, requireStaff, async (req, res) => {
  const dbClient = await pool.connect();
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
      nr_pag,
      authorIds = [],
      genreIds = []
    } = req.body;

    if (!titlu?.trim() || !limba?.trim() || !editura?.trim()) {
      return res.status(400).json({ message: "Title, language, and publisher are required" });
    }

    const numericPret = Number(pret);
    const numericStoc = Number(stoc);
    const numericPages = Number(nr_pag);

    if (
      !Number.isFinite(numericPret) ||
      numericPret < 0 ||
      !Number.isInteger(numericStoc) ||
      numericStoc < 0 ||
      !Number.isInteger(numericPages) ||
      numericPages <= 0
    ) {
      return res.status(400).json({ message: "Invalid price, stock, or page count" });
    }

    await dbClient.query("BEGIN");

    const bookRes = await dbClient.query(
      `INSERT INTO carte (
        titlu, isbn, descriere, pret, stoc, data_publicare, limba, editura, nr_pag
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *`,
      [
        titlu.trim(),
        isbn?.trim() || null,
        descriere?.trim() || null,
        numericPret,
        numericStoc,
        data_publicare || null,
        limba.trim(),
        editura.trim(),
        numericPages
      ]
    );

    const newBook = bookRes.rows[0];

    for (const coda of authorIds) {
      await dbClient.query(
        `INSERT INTO carte_autor (codcar, coda)
         VALUES ($1, $2)
         ON CONFLICT DO NOTHING`,
        [newBook.codcar, Number(coda)]
      );
    }

    for (const codg of genreIds) {
      await dbClient.query(
        `INSERT INTO carte_gen (codcar, codg)
         VALUES ($1, $2)
         ON CONFLICT DO NOTHING`,
        [newBook.codcar, Number(codg)]
      );
    }

    await dbClient.query("COMMIT");
    res.status(201).json(newBook);
  } catch (error) {
    await dbClient.query("ROLLBACK");
    if (error.code === "23505") {
      return res.status(409).json({ message: "A book with this ISBN already exists" });
    }
    console.error("Create book error:", error.message);
    res.status(500).json({ message: "Could not create book" });
  } finally {
    dbClient.release();
  }
});

// Update book stock & price (or full metadata)
app.patch("/api/admin/books/:id", authenticateToken, requireStaff, async (req, res) => {
  try {
    const codcar = Number(req.params.id);
    const { pret, stoc, titlu, editura, limba } = req.body;

    const currentRes = await pool.query("SELECT * FROM carte WHERE codcar = $1", [codcar]);
    if (currentRes.rows.length === 0) {
      return res.status(404).json({ message: "Book not found" });
    }

    const current = currentRes.rows[0];
    const nextPret = pret !== undefined ? Number(pret) : Number(current.pret);
    const nextStoc = stoc !== undefined ? Number(stoc) : Number(current.stoc);
    const nextTitlu = titlu !== undefined ? String(titlu).trim() : current.titlu;
    const nextEditura = editura !== undefined ? String(editura).trim() : current.editura;
    const nextLimba = limba !== undefined ? String(limba).trim() : current.limba;

    if (!Number.isFinite(nextPret) || nextPret < 0 || !Number.isInteger(nextStoc) || nextStoc < 0) {
      return res.status(400).json({ message: "Invalid price or stock value" });
    }

    const updated = await pool.query(
      `UPDATE carte
       SET titlu = $1, editura = $2, limba = $3, pret = $4, stoc = $5
       WHERE codcar = $6
       RETURNING *`,
      [nextTitlu, nextEditura, nextLimba, nextPret, nextStoc, codcar]
    );

    res.json(updated.rows[0]);
  } catch (error) {
    console.error("Update book error:", error.message);
    res.status(500).json({ message: "Could not update book" });
  }
});

// Delete a book and its dependent join/list/sale rows cleanly
app.delete("/api/admin/books/:id", authenticateToken, requireStaff, async (req, res) => {
  const dbClient = await pool.connect();
  try {
    const codcar = Number(req.params.id);
    await dbClient.query("BEGIN");

    await dbClient.query("DELETE FROM carte_autor WHERE codcar = $1", [codcar]);
    await dbClient.query("DELETE FROM carte_gen WHERE codcar = $1", [codcar]);
    await dbClient.query("DELETE FROM cos WHERE codcar = $1", [codcar]);
    await dbClient.query("DELETE FROM salvare WHERE codcar = $1", [codcar]);
    await dbClient.query("DELETE FROM rating WHERE codcar = $1", [codcar]);
    await dbClient.query("DELETE FROM vanzare WHERE codcar = $1", [codcar]);

    const deleted = await dbClient.query(
      "DELETE FROM carte WHERE codcar = $1 RETURNING codcar",
      [codcar]
    );

    if (deleted.rows.length === 0) {
      await dbClient.query("ROLLBACK");
      return res.status(404).json({ message: "Book not found" });
    }

    await dbClient.query("COMMIT");
    res.json({ message: "Book deleted", codcar });
  } catch (error) {
    await dbClient.query("ROLLBACK");
    console.error("Delete book error:", error.message);
    res.status(500).json({ message: "Could not delete book" });
  } finally {
    dbClient.release();
  }
});

// Add an author
app.post("/api/admin/authors", authenticateToken, requireStaff, async (req, res) => {
  try {
    const { nume, biografie } = req.body;
    if (!nume || !String(nume).trim()) {
      return res.status(400).json({ message: "Author name is required" });
    }

    const result = await pool.query(
      `INSERT INTO autor (nume, biografie)
       VALUES ($1, $2)
       RETURNING *`,
      [String(nume).trim(), biografie?.trim() || null]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error("Create author error:", error.message);
    res.status(500).json({ message: "Could not create author" });
  }
});

// Add a genre
app.post("/api/admin/genres", authenticateToken, requireStaff, async (req, res) => {
  try {
    const { denumire } = req.body;
    if (!denumire || !String(denumire).trim()) {
      return res.status(400).json({ message: "Genre name is required" });
    }

    const result = await pool.query(
      `INSERT INTO gen (denumire)
       VALUES ($1)
       RETURNING *`,
      [String(denumire).trim()]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    if (error.code === "23505") {
      return res.status(409).json({ message: "Genre already exists" });
    }
    console.error("Create genre error:", error.message);
    res.status(500).json({ message: "Could not create genre" });
  }
});

// Toggle admin flag on an employee (admin-only)
app.patch("/api/admin/staff/:codang/admin", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const codang = Number(req.params.codang);
    const { admin } = req.body;

    if (typeof admin !== "boolean") {
      return res.status(400).json({ message: "admin must be a boolean" });
    }

    if (Number(req.user.id) === codang && !admin) {
      return res.status(400).json({ message: "You cannot remove your own admin status" });
    }

    const result = await pool.query(
      `UPDATE angajat
       SET admin = $1
       WHERE codang = $2
       RETURNING codang, nume, prenume, email, admin`,
      [admin, codang]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Staff member not found" });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error("Update staff admin status error:", error.message);
    res.status(500).json({ message: "Could not update staff role" });
  }
});

// Create a new employee account (admin-only)
app.post("/api/admin/staff", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { nume, prenume, email, parola, admin = false } = req.body;

    if (
      typeof nume !== "string" ||
      typeof prenume !== "string" ||
      typeof email !== "string" ||
      typeof parola !== "string" ||
      !nume.trim() ||
      !prenume.trim() ||
      !email.trim() ||
      parola.length < 12
    ) {
      return res.status(400).json({
        message: "Last name, first name, email, and a password of at least 12 characters are required"
      });
    }

    const cleanEmail = email.trim().toLowerCase();
    const isAdminFlag = Boolean(admin);

    // Prevent duplicate emails across both client and angajat tables
    const existingUser = await pool.query(
      `SELECT email FROM client WHERE email = $1
       UNION
       SELECT email FROM angajat WHERE email = $1`,
      [cleanEmail]
    );

    if (existingUser.rows.length > 0) {
      return res.status(409).json({
        message: "Email is already registered"
      });
    }

    const hashedPassword = await bcrypt.hash(parola, 12);

    const result = await pool.query(
      `INSERT INTO angajat (nume, prenume, email, parola, admin)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING codang, nume, prenume, email, admin`,
      [nume.trim(), prenume.trim(), cleanEmail, hashedPassword, isAdminFlag]
    );

    res.status(201).json({
      message: "Employee account created successfully",
      staff: result.rows[0]
    });
  } catch (error) {
    if (error.code === "23505") {
      return res.status(409).json({
        message: "Email is already registered"
      });
    }
    console.error("Create employee error:", error.message);
    res.status(500).json({ message: "Could not create employee account" });
  }
});

// Record an in-store sale (any employee: simple staff or admin)
app.post("/api/admin/sales", authenticateToken, requireStaff, async (req, res) => {
  const dbClient = await pool.connect();

  try {
    const codang = Number(req.user.id);
    const codcar = Number(req.body.codcar);
    const nr_ex = Number(req.body.nr_ex);
    const clientEmail = req.body.clientEmail ? String(req.body.clientEmail).trim().toLowerCase() : "";

    if (!Number.isInteger(codcar) || codcar <= 0) {
      return res.status(400).json({ message: "Please select a valid book" });
    }

    if (!Number.isInteger(nr_ex) || nr_ex <= 0) {
      return res.status(400).json({ message: "Quantity must be at least 1" });
    }

    await dbClient.query("BEGIN");

    // Lock the book row to check and decrement stock safely
    const bookRes = await dbClient.query(
      "SELECT codcar, titlu, pret, stoc FROM carte WHERE codcar = $1 FOR UPDATE",
      [codcar]
    );

    if (bookRes.rows.length === 0) {
      await dbClient.query("ROLLBACK");
      return res.status(404).json({ message: "Book not found" });
    }

    const book = bookRes.rows[0];
    if (book.stoc < nr_ex) {
      await dbClient.query("ROLLBACK");
      return res.status(400).json({
        message: `Insufficient stock for "${book.titlu}". Available: ${book.stoc}`
      });
    }

    // Optional: link sale to an existing client if an email was entered
    let codcli = null;
    if (clientEmail) {
      const clientRes = await dbClient.query(
        "SELECT codcli FROM client WHERE email = $1",
        [clientEmail]
      );
      if (clientRes.rows.length === 0) {
        await dbClient.query("ROLLBACK");
        return res.status(404).json({ message: `No client found with email "${clientEmail}"` });
      }
      codcli = clientRes.rows[0].codcli;
    }

    await dbClient.query(
      `INSERT INTO vanzare (codcli, codcar, codang, nr_ex)
       VALUES ($1, $2, $3, $4)`,
      [codcli, codcar, codang, nr_ex]
    );

    await dbClient.query(
      `UPDATE carte
       SET stoc = stoc - $1
       WHERE codcar = $2`,
      [nr_ex, codcar]
    );

    await dbClient.query("COMMIT");

    res.status(201).json({
      message: "Sale recorded successfully",
      titlu: book.titlu,
      nr_ex,
      total: Number((Number(book.pret) * nr_ex).toFixed(2))
    });
  } catch (error) {
    await dbClient.query("ROLLBACK");
    console.error("Record sale error:", error.message);
    res.status(500).json({ message: "Could not record sale" });
  } finally {
    dbClient.release();
  }
});

// Aggregated statistics & report rows for Admins
app.get("/api/admin/reports", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { from, to } = req.query;

    const conditions = [];
    const values = [];
    let idx = 1;

    if (from) {
      conditions.push(`v.data_vanzare >= $${idx}::date`);
      values.push(from);
      idx++;
    }
    if (to) {
      conditions.push(`v.data_vanzare < ($${idx}::date + INTERVAL '1 day')`);
      values.push(to);
      idx++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    const [
      kpisRes,
      topBooksRes,
      dailySalesRes,
      genreSalesRes,
      lowStockRes,
      detailedSalesRes
    ] = await Promise.all([
      pool.query(
        `SELECT
           COUNT(*)::int AS transactions,
           COALESCE(SUM(v.nr_ex), 0)::int AS units_sold,
           COALESCE(SUM(v.nr_ex * c.pret), 0)::numeric(12,2) AS revenue,
           COUNT(DISTINCT v.codcli)::int AS unique_clients
         FROM vanzare v
         JOIN carte c ON v.codcar = c.codcar
         ${whereClause}`,
        values
      ),
      pool.query(
        `SELECT
           c.codcar,
           c.titlu,
           c.editura,
           c.stoc,
           COALESCE(SUM(v.nr_ex), 0)::int AS units_sold,
           COALESCE(SUM(v.nr_ex * c.pret), 0)::numeric(12,2) AS revenue
         FROM vanzare v
         JOIN carte c ON v.codcar = c.codcar
         ${whereClause}
         GROUP BY c.codcar, c.titlu, c.editura, c.stoc
         ORDER BY units_sold DESC, revenue DESC
         LIMIT 15`,
        values
      ),
      pool.query(
        `SELECT
           TO_CHAR(DATE(v.data_vanzare), 'YYYY-MM-DD') AS sale_date,
           COUNT(*)::int AS transactions,
           COALESCE(SUM(v.nr_ex), 0)::int AS units_sold,
           COALESCE(SUM(v.nr_ex * c.pret), 0)::numeric(12,2) AS revenue
         FROM vanzare v
         JOIN carte c ON v.codcar = c.codcar
         ${whereClause}
         GROUP BY DATE(v.data_vanzare)
         ORDER BY sale_date DESC
         LIMIT 30`,
        values
      ),
      pool.query(
        `SELECT
           g.denumire AS genre,
           COALESCE(SUM(v.nr_ex), 0)::int AS units_sold,
           COALESCE(SUM(v.nr_ex * c.pret), 0)::numeric(12,2) AS revenue
         FROM vanzare v
         JOIN carte c ON v.codcar = c.codcar
         JOIN carte_gen cg ON c.codcar = cg.codcar
         JOIN gen g ON cg.codg = g.codg
         ${whereClause}
         GROUP BY g.denumire
         ORDER BY revenue DESC`,
        values
      ),
      pool.query(
        `SELECT codcar, titlu, editura, pret, stoc
         FROM carte
         WHERE stoc <= 5
         ORDER BY stoc ASC, titlu ASC`
      ),
      pool.query(
        `SELECT
           TO_CHAR(v.data_vanzare, 'YYYY-MM-DD HH24:MI') AS data_vanzare,
           c.titlu,
           c.isbn,
           c.editura,
           v.nr_ex,
           c.pret AS unit_price,
           (v.nr_ex * c.pret)::numeric(12,2) AS subtotal,
           COALESCE(cl.email, 'Walk-in / Guest') AS client_email,
           COALESCE(a.email, 'Online Self-Checkout') AS processed_by
         FROM vanzare v
         JOIN carte c ON v.codcar = c.codcar
         LEFT JOIN client cl ON v.codcli = cl.codcli
         LEFT JOIN angajat a ON v.codang = a.codang
         ${whereClause}
         ORDER BY v.data_vanzare DESC`,
        values
      )
    ]);

    res.json({
      kpis: kpisRes.rows[0],
      topBooks: topBooksRes.rows,
      dailySales: dailySalesRes.rows,
      genreSales: genreSalesRes.rows,
      lowStock: lowStockRes.rows,
      detailedSales: detailedSalesRes.rows
    });
  } catch (error) {
    console.error("Admin reports error:", error.message);
    res.status(500).json({ message: "Could not load reports" });
  }
});

// Downloadable CSV export (sales or inventory)
app.get("/api/admin/reports/export.csv", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { type = "sales", from, to } = req.query;

    const escapeCsv = (val) => {
      if (val === null || val === undefined) return "";
      const str = String(val);
      if (str.includes(",") || str.includes('"') || str.includes("\n")) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    if (type === "inventory") {
      const invRes = await pool.query(`
        SELECT
          c.codcar,
          c.titlu,
          c.isbn,
          c.editura,
          c.limba,
          c.pret,
          c.stoc,
          COALESCE(ROUND(AVG(r.nota)::numeric, 2), 0) AS avg_rating,
          COUNT(r.nota)::int AS rating_count
        FROM carte c
        LEFT JOIN rating r ON c.codcar = r.codcar
        GROUP BY c.codcar
        ORDER BY c.titlu ASC
      `);

      const headers = ["ID", "Title", "ISBN", "Publisher", "Language", "Price (RON)", "Stock", "Avg Rating", "Ratings"];
      const rows = invRes.rows.map((r) =>
        [r.codcar, r.titlu, r.isbn, r.editura, r.limba, r.pret, r.stoc, r.avg_rating, r.rating_count]
          .map(escapeCsv)
          .join(",")
      );

      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader("Content-Disposition", `attachment; filename="inventory-report-${new Date().toISOString().slice(0, 10)}.csv"`);
      return res.send("\uFEFF" + [headers.join(","), ...rows].join("\n"));
    }

    const conditions = [];
    const values = [];
    let idx = 1;

    if (from) {
      conditions.push(`v.data_vanzare >= $${idx}::date`);
      values.push(from);
      idx++;
    }
    if (to) {
      conditions.push(`v.data_vanzare < ($${idx}::date + INTERVAL '1 day')`);
      values.push(to);
      idx++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    const salesRes = await pool.query(
      `SELECT
         TO_CHAR(v.data_vanzare, 'YYYY-MM-DD HH24:MI') AS data_vanzare,
         c.titlu,
         c.isbn,
         c.editura,
         v.nr_ex,
         c.pret AS unit_price,
         (v.nr_ex * c.pret)::numeric(12,2) AS subtotal,
         COALESCE(cl.email, 'Walk-in / Guest') AS client_email,
         COALESCE(a.email, 'Online Self-Checkout') AS processed_by
       FROM vanzare v
       JOIN carte c ON v.codcar = c.codcar
       LEFT JOIN client cl ON v.codcli = cl.codcli
       LEFT JOIN angajat a ON v.codang = a.codang
       ${whereClause}
       ORDER BY v.data_vanzare DESC`,
      values
    );

    const headers = [
      "Date",
      "Book Title",
      "ISBN",
      "Publisher",
      "Copies Sold",
      "Unit Price (RON)",
      "Subtotal (RON)",
      "Client",
      "Processed By"
    ];

    const rows = salesRes.rows.map((r) =>
      [r.data_vanzare, r.titlu, r.isbn, r.editura, r.nr_ex, r.unit_price, r.subtotal, r.client_email, r.processed_by]
        .map(escapeCsv)
        .join(",")
    );

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="sales-report-${new Date().toISOString().slice(0, 10)}.csv"`);
    return res.send("\uFEFF" + [headers.join(","), ...rows].join("\n"));
  } catch (error) {
    console.error("CSV export error:", error.message);
    res.status(500).json({ message: "Failed to export CSV" });
  }
});




app.listen(PORT,()=>{
    console.log(`Server running at http://localhost:${PORT}`);

});