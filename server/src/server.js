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

app.get("/api/books",async(req,res)=>{
    try{
        const result= await pool.query(`
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
      ORDER BY codcar DESC
    `);
    res.json(result.rows);
    } catch(error){
         console.error("Could not retrieve books:", error.message);

    res.status(500).json({
      message: "Could not retrieve books"
    });
    }
});

app.listen(PORT,()=>{
    console.log(`Server running at http://localhost:${PORT}`);

});