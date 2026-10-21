// Importação dos módulos necessários
const express = require('express');
const path = require('path');
const rotas = require('./routes/index.js');

const app = express();
const port = process.env.PORT || 3000; // Usa a porta da nuvem ou a 3000 localmente

// EJS como template engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Arquivos estáticos (CSS, JS, imagens)
app.use(express.static(path.join(__dirname, 'public')));

// body parser para processar dados de formulários
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Conectando as rotas à aplicação principal
app.use('/', rotas);

app.listen(port, () => {
  console.log(`Servidor rodando em http://localhost:${port}`);
});
