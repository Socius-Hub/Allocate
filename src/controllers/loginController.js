import { LoginModel } from '../models/login.js';

export const LoginController = {
  // GET /api/login
  async getAllLogins(req, res) {
    try {
      const logins = await LoginModel.findAll();
      res.status(200).json({ success: true, data: logins });
    } catch (error) {
      console.error('Erro ao buscar logins:', error);
      res.status(500).json({ success: false, message: 'Erro interno no servidor' });
    }
  },

  // GET /api/login/:id
  async getLoginById(req, res) {
    try {
      const { id } = req.params;
      const login = await LoginModel.findById(id);

      if (!login) {
        return res.status(404).json({ success: false, message: 'Login não encontrado.' });
      }

      res.status(200).json({ success: true, data: login });
    } catch (error) {
      console.error('Erro ao buscar login:', error);
      res.status(500).json({ success: false, message: 'Erro interno no servidor' });
    }
  },

  // POST /api/login
  async createLogin(req, res) {
    try {
      const { email, senha_hash } = req.body;

      if (!email || !senha_hash) {
        return res.status(400).json({ 
          success: false, 
          message: 'Email e senha são obrigatórios.' 
        });
      }

      const newLogin = await LoginModel.create(email, senha_hash);
      res.status(201).json({ success: true, data: newLogin });
    } catch (error) {
      console.error('Erro ao criar login:', error);
      res.status(500).json({ success: false, message: 'Erro interno no servidor' });
    }
  },

  // PUT /api/login/:id
  async updateLogin(req, res) {
    try {
      const { id } = req.params;
      const { email, senha_hash } = req.body;

      if (!email || !senha_hash) {
        return res.status(400).json({ 
          success: false, 
          message: 'Email e senha são obrigatórios para atualização.' 
        });
      }

      const updated = await LoginModel.update(id, email, senha_hash);

      if (!updated) {
        return res.status(404).json({ success: false, message: 'Login não encontrado para atualização.' });
      }

      res.status(200).json({ 
        success: true, 
        message: 'Login atualizado com sucesso!', 
        data: { id: Number(id), email, senha_hash } 
      });
    } catch (error) {
      console.error('Erro ao atualizar login:', error);
      res.status(500).json({ success: false, message: 'Erro interno no servidor' });
    }
  },

  // DELETE /api/login/:id
  async deleteLogin(req, res) {
    try {
      const { id } = req.params;
      const deleted = await LoginModel.delete(id);

      if (!deleted) {
        return res.status(404).json({ success: false, message: 'Login não encontrado para exclusão.' });
      }

      res.status(200).json({ success: true, message: 'Login excluído com sucesso!' });
    } catch (error) {
      console.error('Erro ao excluir login:', error);
      res.status(500).json({ success: false, message: 'Erro interno no servidor' });
    }
  }
};