/*

  OBS: Este arquivo é responsável por fornecer os controladores para gerenciar os funcionários do sistema, 
       incluindo a listagem, criação, edição, exclusão e visualização de perfis de usuários.

*/

import bcrypt from "bcrypt";
import { UsuarioModel } from "../models/UsuarioModel.js";
import { InscricaoModel } from "../models/inscricaoModel.js";
import { OrcamentoModel } from "../models/OrcamentoModel.js";
import { DepartamentoModel, PerfilModel } from "../models/CadastrosModel.js";
import { ehAdmin, PERFIL_ADMIN } from "../middlewares/auth.js";
import { SALT_ROUNDS, validarSenha } from "./authController.js";
import { Validador } from "../utils/validador.js";
import {
  controller,
  idParam,
  naoEncontrado,
  paginacao,
  montarQuery,
  ErroHttp,
} from "../utils/http.js";

//Busca e consolida as opções de perfis de acesso e departamentos disponíveis
async function opcoes() {
  const [perfis, departamentos] = await Promise.all([
    PerfilModel.listar(),
    DepartamentoModel.listar(),
  ]);
  return { perfis, departamentos };
}

async function validarUsuario(
  body,
  { perfis, departamentos },
  existente = null,
) {
  const v = new Validador(body);
  v.campo("nome_completo", "Nome completo").obrigatorio().min(3).max(250);
  v.campo("crm_matricula", "CRM / Matrícula").obrigatorio().max(250);
  v.campo("telefone", "Telefone").obrigatorio().telefone();
  v.campo("email", "E-mail").obrigatorio().email().max(250);
  v.campo("id_perfil", "Perfil de acesso")
    .obrigatorio()
    .em(perfis.map((p) => p.id_perfil));
  v.campo("id_depto", "Departamento")
    .obrigatorio()
    .em(departamentos.map((d) => d.id_depto));
  v.campo("status", "Status").obrigatorio().em(["ATIVO", "INATIVO"]);

  // Valida a senha apenas se for novo usuário ou se foi fornecida uma nova senha na edição
  if (!existente || body.senha)
    validarSenha(v, "senha", existente ? "Nova senha" : "Senha provisória");

  // Validação de duplicidade de e-mail (ignorando o próprio ID do login em caso de edição)
  if (
    !v.erros.email &&
    (await UsuarioModel.emailEmUso(
      body.email.trim(),
      existente?.id_login ?? null,
    ))
  ) {
    v.erros.email = "Este e-mail já está em uso por outro usuário.";
  }
  return v;
}

/*Normaliza e prepara os dados do formulário para persistência na base de dados,
gerando o hash seguro da senha via bcrypt caso tenha sido informada*/
const normalizar = async (b) => ({
  nome_completo: b.nome_completo.trim(),
  crm_matricula: b.crm_matricula.trim(),
  telefone: b.telefone.trim(),
  email: b.email.trim(),
  id_perfil: Number(b.id_perfil),
  id_depto: Number(b.id_depto),
  status: b.status,
  senhaHash: b.senha ? await bcrypt.hash(b.senha, SALT_ROUNDS) : null,
});

//Auxiliar para carregar um utilizador pelo ID passado nos parâmetros da rota
async function carregar(req) {
  const id = idParam(req.params.id);
  const u = id && (await UsuarioModel.buscarPorId(id));
  if (!u) throw naoEncontrado("Usuário");
  return u;
}

//Lista os funcionários com suporte a filtros
export const FuncionarioController = controller({
  async listar(req, res) {
    const filtros = {
      id_depto: idParam(req.query.depto),
      busca: (req.query.busca || "").trim(),
    };
    const { pagina, porPagina, offset } = paginacao(req);

    // Executa consultas paralelas para obter utilizadores paginados, contagem total e departamentos
    const [usuarios, total, departamentos] = await Promise.all([
      UsuarioModel.listar(filtros, { limite: porPagina, offset }),
      UsuarioModel.contar(filtros),
      DepartamentoModel.listar(),
    ]);

    res.render("funcionarios", {
      titulo: "Perfis de Equipe",
      pagina: "funcionarios",
      usuarios,
      total,
      departamentos,
      filtros,
      paginaAtual: pagina,
      porPagina,
      totalPaginas: Math.max(1, Math.ceil(total / porPagina)),
      link: (m) =>
        `/funcionarios${montarQuery({ depto: req.query.depto, busca: filtros.busca }, m)}`,
    });
  },

  //Exibe o perfil detalhado de um utilizador, incluindo as suas inscrições e orçamento do departamento
  async perfil(req, res) {
    const u = await carregar(req);
    const logado = req.session?.usuario;

    // Validação de permissão: apenas administradores ou o próprio utilizador podem ver o perfil
    if (!ehAdmin(logado) && logado?.id_usuario !== u.id_usuario) {
      throw new ErroHttp(403, "Você só pode visualizar o seu próprio perfil.");
    }

    const [inscricoes, orcamento] = await Promise.all([
      InscricaoModel.listarPorUsuario(u.id_usuario),
      OrcamentoModel.doDepartamentoNoCicloAtivo(u.id_depto),
    ]);

    res.render("funcionario-perfil", {
      titulo: u.nome_completo,
      tituloHeader: "Perfil",
      pagina: ehAdmin(logado) ? "funcionarios" : "perfil",
      u,
      inscricoes,
      orcamento,
    });
  },

  //atalho que redireciona o utilizador autenticado para a página do seu próprio perfil
  meuPerfil(req, res) {
    res.redirect(`/funcionarios/${req.session?.usuario?.id_usuario}`);
  },

  //Renderiza o formulário para cadastro de um novo utilizador
  async novo(req, res) {
    const perfilPadrao = (await PerfilModel.buscarPorTipo("Usuário"))
      ?.id_perfil;
    res.render("usuario-form", {
      titulo: "Novo Usuário",
      pagina: "funcionarios",
      u: null,
      dados: { status: "ATIVO", id_perfil: perfilPadrao },
      ...(await opcoes()),
    });
  },

  //Processa a criação de um novo utilizador após validação dos dados
  async criar(req, res) {
    const ops = await opcoes();
    const v = await validarUsuario(req.body, ops);

    if (!v.valido) {
      return res.status(400).render("usuario-form", {
        titulo: "Novo Usuário",
        pagina: "funcionarios",
        u: null,
        dados: req.body,
        erros: v.erros,
        ...ops,
      });
    }

    const id = await UsuarioModel.criar(await normalizar(req.body));
    req.flash("sucesso", "Usuário cadastrado com sucesso.");
    res.redirect(`/funcionarios/${id}`);
  },

  //Renderiza o formulário de edição de um utilizador existente
  async editar(req, res) {
    const u = await carregar(req);
    res.render("usuario-form", {
      titulo: "Editar Usuário",
      pagina: "funcionarios",
      u,
      dados: u,
      ...(await opcoes()),
    });
  },

  //Processa a atualização dos dados de um utilizador existente após validação
  async atualizar(req, res) {
    const u = await carregar(req);
    const ops = await opcoes();
    const v = await validarUsuario(req.body, ops, u);

    // Regra de segurança: impede retirar privilégios de admin do último administrador ativo
    const perfilAdmin = ops.perfis.find((p) => p.tipo === PERFIL_ADMIN);
    const deixaDeSerAdmin =
      u.perfil === PERFIL_ADMIN &&
      (Number(req.body.id_perfil) !== perfilAdmin?.id_perfil ||
        req.body.status !== "ATIVO");

    if (deixaDeSerAdmin && (await UsuarioModel.contarAdmins()) <= 1) {
      v.erros.id_perfil =
        "Este é o único administrador ativo; ele não pode perder o acesso.";
    }

    if (!v.valido) {
      return res.status(400).render("usuario-form", {
        titulo: "Editar Usuário",
        pagina: "funcionarios",
        u,
        dados: req.body,
        erros: v.erros,
        ...ops,
      });
    }
    await UsuarioModel.atualizar(u.id_usuario, await normalizar(req.body));

    // Se o utilizador editado for o próprio utilizador logado, atualiza os dados na sessão em tempo real
    if (u.id_usuario === req.session?.usuario?.id_usuario) {
      const atualizado = await UsuarioModel.buscarPorId(u.id_usuario);
      Object.assign(req.session.usuario, {
        nome: atualizado.nome_completo,
        email: atualizado.email,
        perfil: atualizado.perfil,
        id_depto: atualizado.id_depto,
      });
    }
    req.flash("sucesso", "Usuário atualizado com sucesso.");
    res.redirect(`/funcionarios/${u.id_usuario}`);
  },

  //Remove um utilizador da base de dados
  async excluir(req, res) {
    const u = await carregar(req);

    // Impede auto-exclusão
    if (u.id_usuario === req.session?.usuario?.id_usuario) {
      req.flash("erro", "Você não pode excluir a sua própria conta.");
      return res.redirect(`/funcionarios/${u.id_usuario}`);
    }

    // Impede exclusão do último administrador ativo do sistema
    if (
      u.perfil === PERFIL_ADMIN &&
      u.status === "ATIVO" &&
      (await UsuarioModel.contarAdmins()) <= 1
    ) {
      req.flash("erro", "Não é possível excluir o único administrador ativo.");
      return res.redirect(`/funcionarios/${u.id_usuario}`);
    }
    await UsuarioModel.excluir(u.id_usuario);
    req.flash("sucesso", `Usuário "${u.nome_completo}" excluído.`);
    res.redirect("/funcionarios");
  },
});