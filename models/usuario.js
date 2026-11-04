import express from "express";
import dotenv from "dotenv";
import { pool } from "./db.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

const router = Router();

// Criar Usuário
router.post("/usuario", async (req, res) => {
    try {
        const { nomeCompleto, CRM_matricula, telefone, idPerfil, idDepto, idLogin, status } = req.body;

        const [result] = await pool.query(
            `INSERT INTO usuario (nomeCompleto, CRM_matricula, telefone, idPerfil, idDepto, idLogin, status) 
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [nomeCompleto, CRM_matricula, telefone, idPerfil, idDepto, idLogin, status || 'ATIVO']
        );

        res.status(201).json({ 
            message: "Usuário cadastrado com sucesso", 
            idUsuario: result.insertId, 
            nomeCompleto 
        });
    } catch (error) {
        console.error("Erro ao criar usuário:", error);
        res.status(500).json({ message: "Erro ao criar usuário" });
    }
});

// Listar todos os Usuários com detalhes
router.get("/usuarios", async (req, res) => {
    try {
        const [rows] = await pool.query(`
            SELECT 
                u.idUsuario, 
                u.nomeCompleto, 
                u.CRM_matricula, 
                u.telefone, 
                u.status,
                p.idPerfil,
                p.tipo AS perfil_tipo,
                d.idDepto,
                d.nomeDepto,
                l.idLogin,
                l.email AS login_email
            FROM usuario u
            JOIN perfil_acesso p ON u.idPerfil = p.idPerfil
            JOIN departamento d ON u.idDepto = d.idDepto
            JOIN login l ON u.idLogin = l.idLogin
        `);
        res.json(rows);
    } catch (error) {
        console.error("Erro ao buscar usuários:", error);
        res.status(500).json({ message: "Erro ao buscar usuários" });
    }
});

// Buscar um Usuário  por ID 
router.get("/usuario/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const [rows] = await pool.query(`
            SELECT 
                u.idUsuario, 
                u.nomeCompleto, 
                u.CRM_matricula, 
                u.telefone, 
                u.status,
                p.idPerfil,
                p.tipo AS perfil_tipo,
                d.idDepto,
                d.nomeDepto,
                l.idLogin,
                l.email AS login_email
            FROM usuario u
            JOIN perfil_acesso p ON u.idPerfil = p.idPerfil
            JOIN departamento d ON u.idDepto = d.idDepto
            JOIN login l ON u.idLogin = l.idLogin
            WHERE u.idUsuario = ?
        `, [id]);

        if (rows.length === 0) {
            return res.status(404).json({ message: "Usuário não encontrado" });
        }

        res.json(rows[0]);
    } catch (error) {
        console.error("Erro ao buscar usuário:", error);
        res.status(500).json({ message: "Erro ao buscar usuário" });
    }
});

// Atualizar Usuário
router.put("/usuario/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const { nomeCompleto, CRM_matricula, telefone, idPerfil, idDepto, status } = req.body;

        const [result] = await pool.query(
            `UPDATE usuario 
             SET nomeCompleto = ?, CRM_matricula = ?, telefone = ?, idPerfil = ?, idDepto = ?, status = ? 
             WHERE idUsuario = ?`,
            [nomeCompleto, CRM_matricula, telefone, idPerfil, idDepto, status, id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: "Usuário não encontrado" });
        }

        res.json({ message: "Usuário atualizado com sucesso", idUsuario: id });
    } catch (error) {
        console.error("Erro ao atualizar usuário:", error);
        res.status(500).json({ message: "Erro ao atualizar usuário" });
    }
});

// Deletar Usuário
router.delete("/usuario/:id", async (req, res) => {
    try {
        const { id } = req.params;

        const [result] = await pool.query("DELETE FROM usuario WHERE idUsuario = ?", [id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: "Usuário não encontrado" });
        }

        res.json({ message: "Usuário deletado com sucesso", idUsuario: id });
    } catch (error) {
        console.error("Erro ao deletar usuário:", error);
        res.status(500).json({ message: "Erro ao deletar usuário" });
    }
});

export default router;