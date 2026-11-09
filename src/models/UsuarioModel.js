import { query, execute, transaction } from '../config/database.js';
import { estornarInscricoes } from './InscricaoModel.js';

const SELECT_DETALHADO = `
  SELECT u.id_usuario, u.nome_completo, u.crm_matricula, u.telefone, u.cargo, u.status,
         u.id_perfil, p.tipo AS perfil, u.id_depto, d.nome_depto,
         u.id_login, l.email, l.status AS status_login, l.criado_em, l.ultimo_login
  FROM usuario u
  JOIN login l         ON l.id_login  = u.id_login
  JOIN perfil_acesso p ON p.id_perfil = u.id_perfil
  JOIN departamento d  ON d.id_depto  = u.id_depto`;

function filtros({ id_depto, busca } = {}) {
  const where = [];
  const params = [];
  if (id_depto) {
    where.push('u.id_depto = ?');
    params.push(id_depto);
  }
  if (busca) {
    where.push('(LOWER(u.nome_completo) LIKE ? OR LOWER(l.email) LIKE ?)');
    params.push(`%${busca.toLowerCase()}%`, `%${busca.toLowerCase()}%`);
  }
  return { sql: where.length ? ` WHERE ${where.join(' AND ')}` : '', params };
}

export const UsuarioModel = {
  /** Dados necessários para autenticar (inclui o hash da senha). */
  async buscarParaLogin(email) {
    const rows = await query(
      `SELECT l.id_login, l.email, l.senha_hash, l.status AS status_login,
              u.id_usuario, u.nome_completo, u.status AS status_usuario, u.id_depto, p.tipo AS perfil
       FROM login l
       JOIN usuario u       ON u.id_login  = l.id_login
       JOIN perfil_acesso p ON p.id_perfil = u.id_perfil
       WHERE LOWER(l.email) = LOWER(?)`,
      [email]
    );
    return rows[0] || null;
  },

  async registrarAcesso(idLogin) {
    await execute('UPDATE login SET ultimo_login = CURRENT_TIMESTAMP WHERE id_login = ?', [idLogin]);
  },

  async emailEmUso(email, ignorarIdLogin = null) {
    const rows = await query('SELECT id_login FROM login WHERE LOWER(email) = LOWER(?)', [email]);
    return rows.some((r) => r.id_login !== ignorarIdLogin);
  },

  /** Cria login + usuário numa única transação. Retorna o id_usuario. */
  async criar(d) {
    return transaction(async (tx) => {
      const idLogin = await tx.insert(
        'INSERT INTO login (email, senha_hash, status) VALUES (?, ?, ?)',
        [d.email.toLowerCase(), d.senhaHash, 'ATIVO'],
        'id_login'
      );
      return tx.insert(
        `INSERT INTO usuario (nome_completo, crm_matricula, telefone, cargo, id_perfil, id_depto, id_login, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [d.nome_completo, d.crm_matricula, d.telefone, d.cargo || null, d.id_perfil, d.id_depto, idLogin, d.status || 'ATIVO'],
        'id_usuario'
      );
    });
  },

  async listar(f = {}, { limite = 10, offset = 0 } = {}) {
    const { sql, params } = filtros(f);
    return query(`${SELECT_DETALHADO}${sql} ORDER BY u.nome_completo LIMIT ? OFFSET ?`, [...params, limite, offset]);
  },

  async contar(f = {}) {
    const { sql, params } = filtros(f);
    const [r] = await query(`SELECT COUNT(*) AS total FROM usuario u JOIN login l ON l.id_login = u.id_login${sql}`, params);
    return r.total;
  },

  async listarAtivos() {
    return query(
      `SELECT u.id_usuario, u.nome_completo, d.nome_depto
       FROM usuario u JOIN departamento d ON d.id_depto = u.id_depto
       WHERE u.status = 'ATIVO' ORDER BY u.nome_completo`
    );
  },

  async buscarPorId(id) {
    const rows = await query(`${SELECT_DETALHADO} WHERE u.id_usuario = ?`, [id]);
    return rows[0] || null;
  },

  /** Atualiza dados do usuário e o e-mail de login (e a senha, se informada). */
  async atualizar(id, d) {
    return transaction(async (tx) => {
      const [u] = await tx.query('SELECT id_login FROM usuario WHERE id_usuario = ?', [id]);
      if (!u) return false;
      await tx.execute(
        `UPDATE usuario SET nome_completo = ?, crm_matricula = ?, telefone = ?, cargo = ?,
                id_perfil = ?, id_depto = ?, status = ?
         WHERE id_usuario = ?`,
        [d.nome_completo, d.crm_matricula, d.telefone, d.cargo || null, d.id_perfil, d.id_depto, d.status, id]
      );
      await tx.execute('UPDATE login SET email = ? WHERE id_login = ?', [d.email.toLowerCase(), u.id_login]);
      if (d.senhaHash) {
        await tx.execute('UPDATE login SET senha_hash = ? WHERE id_login = ?', [d.senhaHash, u.id_login]);
      }
      return true;
    });
  },

  async buscarHashSenha(idLogin) {
    const [r] = await query('SELECT senha_hash FROM login WHERE id_login = ?', [idLogin]);
    return r?.senha_hash || null;
  },

  async alterarSenha(idLogin, senhaHash) {
    await execute('UPDATE login SET senha_hash = ? WHERE id_login = ?', [senhaHash, idLogin]);
  },

  /** Exclui o login; o usuário (e suas inscrições) saem junto via ON DELETE CASCADE. */
  async excluir(id) {
    return transaction(async (tx) => {
      const [u] = await tx.query('SELECT id_login FROM usuario WHERE id_usuario = ?', [id]);
      if (!u) return false;
      await estornarInscricoes(tx, 'id_usuario', id);
      return (await tx.execute('DELETE FROM login WHERE id_login = ?', [u.id_login])) > 0;
    });
  },

  async contarAdmins() {
    const [r] = await query(
      `SELECT COUNT(*) AS total FROM usuario u JOIN perfil_acesso p ON p.id_perfil = u.id_perfil
       WHERE p.tipo = 'Administrador' AND u.status = 'ATIVO'`
    );
    return r.total;
  },
};