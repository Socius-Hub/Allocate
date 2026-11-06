import db from '../config/database.js';

export const LoginModel = {
  // Buscar todos os logins
  async findAll() {
    const [rows] = await db.query('SELECT * FROM login');
    return rows;
  },

  // Buscar login por ID
  async findById(id) {
    const [rows] = await db.query('SELECT * FROM login WHERE idLogin = ?', [id]);
    return rows[0];
  },

  // Inserir um novo login
  async create(email, senha_hash) {
    const [result] = await db.query(
      'INSERT INTO login (email, senha_hash) VALUES (?, ?)',
      [email, senha_hash]
    );
    return { id: result.insertId, email, senha_hash };
  },

  // Atualizar um login existente
  async update(idLogin, email, senha_hash) {
    const [result] = await db.query(
      'UPDATE login SET email = ?, senha_hash = ? WHERE idLogin = ?',
      [email, senha_hash, idLogin]
    );
    // Retorna true se encontrou e atualizou pelo menos uma linha
    return result.affectedRows > 0;
  },

  // Deletar um login
  async delete(idLogin) {
    const [result] = await db.query('DELETE FROM login WHERE idLogin = ?', [idLogin]);
    // Retorna true se encontrou e deletou pelo menos uma linha
    return result.affectedRows > 0;
  }
};