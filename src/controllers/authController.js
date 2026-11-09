import bcrypt from 'bcrypt';
import { UsuarioModel } from '../models/UsuarioModel.js';
import { DepartamentoModel, PerfilModel } from '../models/CadastrosModel.js';
import { Validador } from '../utils/validador.js';
import { controller } from '../utils/http.js';

export const SALT_ROUNDS = 10;
const PERFIL_PADRAO_REGISTRO = 'Usuário';
const HASH_FALSO = bcrypt.hashSync('senha-inexistente', SALT_ROUNDS);

const destinoSeguro = (url) => (typeof url === 'string' && url.startsWith('/') && !url.startsWith('//') ? url : '/dashboard');

export function validarSenha(v, campo = 'senha', rotulo = 'Senha') {
  v.campo(campo, rotulo).obrigatorio().min(8).max(72);
  if (!v.erros[campo] && !(/[A-Za-z]/.test(v.valor) && /\d/.test(v.valor))) {
    v.erro('A senha deve conter letras e números.');
  }
}

function iniciarSessao(req, dados) {
  return new Promise((resolve, reject) => {
    req.session.regenerate((err) => {
      if (err) return reject(err);
      req.session.usuario = dados;
      req.session.save((e) => (e ? reject(e) : resolve()));
    });
  });
}

export const AuthController = controller({
  telaLogin(req, res) {
    res.render('login', { titulo: 'Entrar', voltar: req.query.voltar || '' });
  },

  async login(req, res) {
    const { email = '', senha = '', voltar = '' } = req.body;
    const v = new Validador(req.body);
    v.campo('email', 'E-mail').obrigatorio().email();
    v.campo('senha', 'Senha').obrigatorio();

    const renderErro = (mensagem) =>
      res.status(400).render('login', { titulo: 'Entrar', voltar, dados: { email }, erros: v.erros, erroGeral: mensagem });

    if (!v.valido) return renderErro(null);

    const conta = await UsuarioModel.buscarParaLogin(email.trim());
    const senhaOk = await bcrypt.compare(senha, conta?.senha_hash || HASH_FALSO);

    if (!conta || !senhaOk) return renderErro('E-mail ou senha inválidos.');
    if (conta.status_login !== 'ativo' && conta.status_login !== 'ATIVO') {
      return renderErro('Sua conta está inativa ou bloqueada. Procure um administrador.');
    }

    await UsuarioModel.registrarAcesso(conta.id_login);
    await iniciarSessao(req, {
      id_usuario: conta.id_usuario,
      id_login: conta.id_login,
      nome: conta.nome_completo,
      email: conta.email,
      perfil: conta.perfil,
      id_depto: conta.id_depto,
    });
    req.flash('sucesso', `Bem-vindo(a), ${conta.nome_completo}!`);
    res.redirect(destinoSeguro(voltar));
  },

  logout(req, res) {
    req.session.destroy(() => {
      res.clearCookie('allocate.sid');
      res.redirect('/login?saiu=1');
    });
  },

  async telaRegistro(req, res) {
    res.render('registro', { titulo: 'Criar conta', departamentos: await DepartamentoModel.listar() });
  },

  async registrar(req, res) {
    const dados = req.body;
    const departamentos = await DepartamentoModel.listar();

    const v = new Validador(dados);
    v.campo('nome_completo', 'Nome completo').obrigatorio().min(3).max(250);
    v.campo('crm_matricula', 'CRM / Matrícula').obrigatorio().max(250);
    v.campo('telefone', 'Telefone').obrigatorio().telefone();
    v.campo('id_depto', 'Departamento').obrigatorio().em(departamentos.map((d) => d.id_depto));
    v.campo('email', 'E-mail').obrigatorio().email().max(250);
    validarSenha(v);
    v.campo('confirmar_senha', 'Confirmação').obrigatorio().igual('senha', 'As senhas não conferem.');
    v.campo('termos', 'Aceite').obrigatorio();
    if (v.erros.termos) v.erros.termos = 'Você precisa confirmar que os dados são verdadeiros.';

    if (!v.erros.email && (await UsuarioModel.emailEmUso(dados.email.trim()))) {
      v.erros.email = 'Este e-mail já está cadastrado. Faça login ou use outro e-mail.';
    }

    if (!v.valido) {
      return res.status(400).render('registro', { titulo: 'Criar conta', departamentos, dados, erros: v.erros });
    }

    const perfil = await PerfilModel.buscarPorTipo(PERFIL_PADRAO_REGISTRO);
    if (!perfil) throw new Error(`Perfil "${PERFIL_PADRAO_REGISTRO}" não existe no banco.`);

    try {
      const idUsuario = await UsuarioModel.criar({
        email: dados.email.trim(),
        senhaHash: await bcrypt.hash(dados.senha, SALT_ROUNDS),
        nome_completo: dados.nome_completo.trim(),
        crm_matricula: dados.crm_matricula.trim(),
        telefone: dados.telefone.trim(),
        id_perfil: perfil.id_perfil,
        id_depto: Number(dados.id_depto),
      });
      const conta = await UsuarioModel.buscarPorId(idUsuario);
      await iniciarSessao(req, {
        id_usuario: conta.id_usuario,
        id_login: conta.id_login,
        nome: conta.nome_completo,
        email: conta.email,
        perfil: conta.perfil,
        id_depto: conta.id_depto,
      });
      req.flash('sucesso', 'Conta criada com sucesso! Bem-vindo(a) ao Allocate.');
      res.redirect('/dashboard');
    } catch (err) {
      if (err.tipo !== 'UNIQUE') throw err;
      v.erros.email = 'Este e-mail já está cadastrado.';
      res.status(400).render('registro', { titulo: 'Criar conta', departamentos, dados, erros: v.erros });
    }
  },
});