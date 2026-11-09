import 'dotenv/config';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';

import { DB_CLIENT } from './src/config/database.js';
import { inicializarBanco } from './src/config/initDB.js'; // Corrigido para initDB.js
import { criarSessao } from './src/config/session.js';
import { variaveisGlobais } from './src/middlewares/variaveisGlobais.js'; // Corrigido para variaveisGlobais.js
import { paginaNaoEncontrada, tratarErros } from './src/middlewares/erros.js';
import { fmt } from './src/utils/formatadores.js';
import publicRoutes from './src/routes/publicRoutes.js';
import privateRoutes from './src/routes/privateRoutes.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;

// View engine (EJS)
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'src', 'views'));
app.locals.fmt = fmt;

// O Render fica atrás de um proxy HTTPS: necessário para o cookie "secure" da sessão
app.set('trust proxy', 1);
app.disable('x-powered-by');

// Middlewares
app.use(express.static(path.join(__dirname, 'src', 'public'), { maxAge: '1d' }));
app.use(express.urlencoded({ extended: false, limit: '100kb' }));
app.use(criarSessao());
app.use(variaveisGlobais);

// Rotas
app.get('/healthz', (req, res) => res.send('ok'));
app.use(publicRoutes);
app.use(privateRoutes);

// Erros
app.use(paginaNaoEncontrada);
app.use(tr ,tratarErros); // Nota: mantenha apenas tratarErros

// Inicialização
async function iniciar() {
  if (process.env.DB_AUTO_INIT !== 'false') {
    try {
      await inicializarBanco();
    } catch (err) {
      console.error(`[db] Não foi possível preparar o banco (${DB_CLIENT}):`, err.message);
      console.error('[db] Verifique as variáveis de ambiente no arquivo .env (veja .env.example).');
    }
  }
  app.listen(PORT, () => console.log(`Allocate rodando em http://localhost:${PORT} (banco: ${DB_CLIENT})`));
}

iniciar();