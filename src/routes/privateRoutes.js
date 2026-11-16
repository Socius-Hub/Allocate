/*
  ÁREA RESTRITA — todas as rotas abaixo exigem login

  OBS: Define e agrupa todas as rotas protegidas da aplicação que exigem autenticação prévia (middleware `exiginLogin`),
       aplicando restrições adicionais de perfil de administrador (`exigirAdmin`) quando aplicável.
       Mapeia os endpoints para os respetivos controladores (Dashboard, Eventos, Inscrições, Funcionários, Orçamento e Configurações)

 */
import { Router } from "express";
import { exigirLogin, exigirAdmin } from "../middlewares/auth.js";
import { DashboardController } from "../controllers/dashboardController.js";
import { EventoController } from "../controllers/eventoController.js";
import { InscricaoController } from "../controllers/inscricaoController.js";
import { FuncionarioController } from "../controllers/funcionarioController.js";
import { OrcamentoController } from "../controllers/orcamentoController.js";
import { ConfiguracaoController } from "../controllers/configuracaoController.js";

const router = Router();

// MIDDLEWARE GLOBAL DE PROTEÇÃO DE ROTAS RESTIRITAS

// Garante que qualquer acesso aos caminhos listados obrigue o utilizador a estar autenticado.
router.use(
  [
    "/dashboard",
    "/eventos",
    "/inscricoes",
    "/aprovacoes",
    "/perfil",
    "/funcionarios",
    "/orcamento-departamento",
    "/simulador-orcamento",
    "/configuracoes",
  ],
  exigirLogin,
);

// PAINEL DE CONTROLE (DASHBOARD)
router.get("/dashboard", DashboardController.index);

// GESTÃO DE EVENTOS (CRUD)
router.get("/eventos", EventoController.listar);
router.get("/eventos/novo", EventoController.novo);
router.post("/eventos", EventoController.criar);
router.get("/eventos/:id", EventoController.detalhes);
router.get("/eventos/:id/editar", EventoController.editar);
router.post("/eventos/:id", EventoController.atualizar);
router.post("/eventos/:id/excluir", EventoController.excluir);

// TIERS DE INSCRIÇÃO (CRUD)
router.get("/eventos/:id/tiers", EventoController.tiers);
router.post("/eventos/:id/tiers", EventoController.salvarTier);
router.post("/eventos/:id/tiers/:idTier", EventoController.salvarTier);
router.post("/eventos/:id/tiers/:idTier/excluir", EventoController.excluirTier);

// GESTÃO DE INSCRIÇÕES (CRUD)
router.get("/inscricoes", InscricaoController.listar);
router.get("/inscricoes/nova", InscricaoController.nova);
router.post("/inscricoes", InscricaoController.criar);
router.post(
  "/inscricoes/:id/status",
  exigirAdmin,
  InscricaoController.alterarStatus,
);
router.post("/inscricoes/:id/excluir", InscricaoController.excluir);

// FILA DE APROVAÇÕES (Exclusivo para Administradores)
router.get("/aprovacoes", exigirAdmin, InscricaoController.filaAprovacoes);
router.get(
  "/aprovacoes/:id",
  exigirAdmin,
  InscricaoController.detalheAprovacao,
);
router.post("/aprovacoes/:id", exigirAdmin, InscricaoController.decidir);

// FUNCIONÁRIOS / USUÁRIOS (Maioria restrita a Administradores)
router.get("/perfil", FuncionarioController.meuPerfil);
router.get("/funcionarios", exigirAdmin, FuncionarioController.listar);
router.get("/funcionarios/novo", exigirAdmin, FuncionarioController.novo);
router.post("/funcionarios", exigirAdmin, FuncionarioController.criar);
router.get("/funcionarios/:id", FuncionarioController.perfil);
router.get(
  "/funcionarios/:id/editar",
  exigirAdmin,
  FuncionarioController.editar,
);
router.post("/funcionarios/:id", exigirAdmin, FuncionarioController.atualizar);
router.post(
  "/funcionarios/:id/excluir",
  exigirAdmin,
  FuncionarioController.excluir,
);

// ORÇAMENTO DEPARTAMENTAL (CRUD e Exportação)
router.get("/orcamento-departamento", OrcamentoController.departamentos);
router.get("/orcamento-departamento/exportar", OrcamentoController.exportar);
router.post("/orcamento-departamento", exigirAdmin, OrcamentoController.salvar);
router.post(
  "/orcamento-departamento/:id",
  exigirAdmin,
  OrcamentoController.salvar,
);
router.post(
  "/orcamento-departamento/:id/excluir",
  exigirAdmin,
  OrcamentoController.excluir,
);

// SIMULADOR DE ORÇAMENTO E CENÁRIOS
router.get("/simulador-orcamento", OrcamentoController.simulador);
router.post("/simulador-orcamento/cenarios", OrcamentoController.criarCenario);
router.post(
  "/simulador-orcamento/cenarios/:id/itens",
  OrcamentoController.adicionarItem,
);
router.post(
  "/simulador-orcamento/itens/:idItem/excluir",
  OrcamentoController.removerItem,
);
router.post(
  "/simulador-orcamento/cenarios/:id/status",
  exigirAdmin,
  OrcamentoController.statusCenario,
);
router.post(
  "/simulador-orcamento/cenarios/:id/excluir",
  exigirAdmin,
  OrcamentoController.excluirCenario,
);

// CONFIGURAÇÕES DO SISTEMA (segurança e ciclos orçamentários)
router.get("/configuracoes", ConfiguracaoController.index);
router.post("/configuracoes/senha", ConfiguracaoController.alterarSenha);
router.post(
  "/configuracoes/ciclos",
  exigirAdmin,
  ConfiguracaoController.salvarCiclo,
);
router.post(
  "/configuracoes/ciclos/:id",
  exigirAdmin,
  ConfiguracaoController.salvarCiclo,
);
router.post(
  "/configuracoes/ciclos/:id/excluir",
  exigirAdmin,
  ConfiguracaoController.excluirCiclo,
);

export default router;