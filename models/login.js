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
        console.error("Erro ao criar login:", error);
        res.status(500).json({ message: "Erro ao criar login" });
    }
});

// listar logins
app.get("/logins", async (req, res) => {
    try {
        const [rows] = await pool.query("SELECT * FROM login");

        res.json(rows);
    } catch (error) {
        console.error("Erro ao buscar logins:", error);
        res.status(500).json({ message: "Erro ao buscar login" });
    }
});

// atualizar login
app.put("/login/:id", async (req, res) => {
    try {
        const { idLogin } = req.params;
        const { email, senha_hash } = req.body;

        const [result] = await pool.query(
            "UPDATE login SET email = ?, senha_hash = ? WHERE id = ?",
            [email, senha_hash, idLogin]
        );

        if (!result.affectedRows) {
            return res.status(404).json({ message: "Login não encontrado" });
        }

        res.json({ message: "Login atualizado com sucesso", id: idLogin, email, senha_hash });
    } catch (error) {
        console.error("Erro ao atualizar login:", error);
        res.status(500).json({ message: "Erro ao atualizar login" });
    }
});

// deletar login
app.delete("/login/:id", async (req, res) => {
    try {
        const { idLogin } = req.params;

        const [result] = await pool.query("DELETE FROM login WHERE id = ?", [idLogin]);

        if (!result.affectedRows) {
            return res.status(404).json({ message: "Login não encontrado" });
        }

        res.json({ message: "Login deletado com sucesso", id: idLogin });
    } catch (error) {
        console.error("Erro ao deletar login:", error);
        res.status(500).json({ message: "Erro ao deletar login" });
    }
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});