const express=require("express");
const cors=require("cors");
const pool=require("./db");
require("dotenv").config();

const app=express();
const PORT=process.env.PORT || 5000;

app.use(cors({
  origin: process.env.CLIENT_URL || "http://localhost:5173"

}));

app.use(express.json());

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



app.listen(PORT,()=>{
    console.log(`Server running at http://localhost:${PORT}`);

});