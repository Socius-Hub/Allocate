/*

  OBS: Este arquivo é responsável por fornecer os controladores para gerenciar o dashboard do sistema, 
       incluindo a exibição de informações resumidas sobre ciclos orçamentários, inscrições e eventos.

*/

import { EventoModel } from "../models/EventoModel.js";
import { InscricaoModel } from "../models/inscricaoModel.js";
import { CicloModel, OrcamentoModel } from "../models/OrcamentoModel.js";
import { controller } from "../utils/http.js";

// Renderiza a página principal do Dashboard
export const DashboardController = controller({
  async index(req, res) {
    // Obtém o utilizador autenticado a partir da sessão
    const usuario = req.session?.usuario;
    // Procura o ciclo orçamentário atualmente ativo
    const ciclo = await CicloModel.ativo();

    const [
      resumo,
      statusInscricoes,
      proximos,
      minhasInscricoes,
      contagemEventos,
    ] = await Promise.all([
      ciclo
        ? OrcamentoModel.resumo(ciclo.id_ciclo)
        : { limite: 0, utilizado: 0, disponivel: 0 },
      InscricaoModel.contarPorStatus(),
      EventoModel.proximos(5),
      usuario
        ? InscricaoModel.listar(
            { id_usuario: usuario.id_usuario },
            { limite: 5 },
          )
        : [],
      EventoModel.contarPorStatus(),
    ]);

    // Renderiza a view do dashboard enviando todos os dados consolidados
    res.render("dashboard", {
      titulo: "Painel de Controle",
      pagina: "dashboard",
      ciclo,
      resumo,
      pendentes: statusInscricoes.SOLICITADO, // Quantidade de inscrições pendentes/solicitadas
      proximos,
      minhasInscricoes,
      contagemEventos,
    });
  },
});
