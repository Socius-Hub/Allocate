import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import loginRoutes from './src/routes/loginRoutes.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(cors());
app.use(express.json()); 

// ⬇️ ADICIONE ESTA LINHA: Torna a pasta 'public' visível publicamente
app.use(express.static('public'));

// Registrar as Rotas da API
app.use('/api/login', loginRoutes);

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});