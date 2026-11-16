/*

  OBS: Utilitário de Linha de Comando para Gestão da Base de Dados.
       Permite executar a inicialização (`npm run db:init` -> cria as tabelas se ainda não existirem)
       ou o reset completo (`npm run db:reset` -> apaga todos os dados e recria com os valores iniciais) via CLI

 */

import { inicializarBanco } from "../config/initDB.js";
import { pool } from "../config/database.js";

// Lê o argumento passado via linha de comando (ex: 'init' ou 'reset'); predefinição é 'init'
const comando = process.argv[2] || "init";

try {
  // Se o comando for 'reset', força a recriação completa da base de dados
  const forcar = comando === "reset";
  const criado = await inicializarBanco({ forcar });

  if (criado) {
    console.log(
      `[db] Banco de dados ${forcar ? "recriado" : "inicializado"} com sucesso!`,
    );
  } else {
    console.log(
      '[db] As tabelas já existem. Use "npm run db:reset" para recriar.',
    );
  }
} catch (err) {
  // Regista falhas na consola e define o código de saída do processo como erro
  console.error("[db] Falha:", err.message);
  process.exitCode = 1;
} finally {
  // Encerra adequadamente a ligação ao pool de base de dados, garantindo a terminação correta do script CLI
  await pool.end();
}