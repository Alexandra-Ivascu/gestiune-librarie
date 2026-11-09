
const express = require("express");
const bcrypt = require("bcrypt");
const pool = require("../db");

const router = express.Router();
const jwt = require("jsonwebtoken");

router.post("/register", async (req, res) => {
    try {
        const { nume, prenume, email, parola } = req.body;

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
                message: "Invalid registration information"
            });
        }

        const cleanEmail = email.trim().toLowerCase();

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
            `INSERT INTO client (
                nume, prenume, email, parola
            )
            VALUES ($1, $2, $3, $4)
            RETURNING codcli, nume, prenume, email`,
            [nume.trim(), prenume.trim(), cleanEmail, hashedPassword]
        );

        res.status(201).json({
            message: "Account created successfully",
            user: result.rows[0]
        });

    } catch (error) {
        console.error("Registration error:", error.message);

        if (error.code === "23505") {
            return res.status(409).json({
                message: "Email is already registered"
            });
        }

        res.status(500).json({
            message: "Registration failed"
        });
    }
});

router.post("/login", async (req, res) => {
    try {
        const { email, parola } = req.body;

        // Validate input
        if (
            typeof email !== "string" ||
            typeof parola !== "string" ||
            !email.trim() ||
            !parola
        ) {
            return res.status(400).json({
                message: "Email and password are required"
            });
        }

        const cleanEmail = email.trim().toLowerCase();

        // Search in both tables
        const result = await pool.query(
            `SELECT
                codcli AS id,
                nume,
                prenume,
                email,
                parola,
                'client' AS role,
                FALSE AS admin
            FROM client
            WHERE email = $1

            UNION ALL

            SELECT
                codang AS id,
                nume,
                prenume,
                email,
                parola,
                'angajat' AS role,
                admin
            FROM angajat
            WHERE email = $1`,
            [cleanEmail]
        );

        // Check whether account exists
        if (result.rows.length === 0) {
            return res.status(401).json({
                message: "Invalid email or password"
            });
        }

        // Get user
        const user = result.rows[0];

        // Verify password
        const passwordMatch = await bcrypt.compare(
            parola,
            user.parola
        );

        if (!passwordMatch) {
            return res.status(401).json({
                message: "Invalid email or password"
            });
        }

        // Generate JWT
        const token = jwt.sign(
            {
                id: user.id,
                role: user.role
            },
            process.env.JWT_SECRET,
            {
                expiresIn: "1h"
            }
        );

        // Store JWT in HttpOnly cookie
        res.cookie("token", token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            maxAge: 60 * 60 * 1000,
            path: "/"
        });

        // Return user information (never return password)
        res.status(200).json({
            message: "Login successful",
            user: {
                id: user.id,
                nume: user.nume,
                prenume: user.prenume,
                email: user.email,
                role: user.role,
                admin: user.admin
            }
        });

    } catch (error) {
        console.error("Login error:", error.message);

        res.status(500).json({
            message: "Login failed"
        });
    }
});

router.post("/logout", (req, res) => {
    res.clearCookie("token", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/"
    });
    res.status(200).json({ message: "Logged out successfully" });
});

module.exports = router;
