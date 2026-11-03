import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { pool } from "./db.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT;

// Middleware
app.use(cors());
app.use(express.json());

// criar login
app.post("/cadastro", async (req, res) => {
    try {
        const { email, senha_hash } = req.body;

        const [result] = await pool.query(
            "INSERT INTO login (email, senha_hash) VALUES (?, ?)",
            [email, senha_hash]
        );

        res.status(201).json({ message: "Login criado com sucesso", id: result.insertId, email, senha_hash });
    } catch (error) {
        console.error("Error creating login:", error);
        res.status(500).json({ message: "Error creating login" });
    }
});




app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});