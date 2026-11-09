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
    const {
      titlu,
      limba,
      editura,
      maxPret,
      stoc
    } = req.query;

    let query = `
      SELECT
        codcar,
        titlu,
        isbn,
        descriere,
        pret,
        stoc,
        data_publicare,
        limba,
        editura,
        nr_pag
      FROM carte
      WHERE 1=1
    `;

    const values = [];
    let index = 1;

    if (titlu) {
      query += ` AND titlu ILIKE $${index}`;
      values.push(`%${titlu}%`);
      index++;
    }

    if (limba) {
      query += ` AND limba ILIKE $${index}`;
      values.push(limba);
      index++;
    }

    if (editura) {
      query += ` AND editura ILIKE $${index}`;
      values.push(editura);
      index++;
    }

    if (maxPret !== undefined) {
      query += ` AND pret <= $${index}`;
      values.push(maxPret);
      index++;
    }

    if (stoc === "true") {
      query += ` AND stoc > 0`;
    }

    query += ` ORDER BY codcar DESC`;

    const result = await pool.query(query, values);

    res.json(result.rows);

  } catch (error) {
    console.error("Could not retrieve books:", error.message);

    res.status(500).json({
      message: "Could not retrieve books"
    });
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
        ) AS publishers
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
          const id=req.params.id;
          const result= await pool.query(
            "SELECT * FROM carte WHERE codcar=$1",[id]
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





app.listen(PORT,()=>{
    console.log(`Server running at http://localhost:${PORT}`);

});