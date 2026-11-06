import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import productRoutes from './src/routes/loginRoutes.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(cors());
app.use(express.json()); 

// ⬇️ ADICIONE ESTA LINHA: Torna a pasta 'public' visível publicamente
app.use(express.static('public'));

// Registrar as Rotas da API
app.use('/api/products', loginRoutes);

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});