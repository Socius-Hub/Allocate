/*
   ROTAS PÚBLICAS — acessíveis por qualquer visitante, sem login

   OBS: Define e gere todas as rotas acessíveis publicamente por qualquer visitante sem exigência de autenticação prévia,
        bem como as rotas dedicadas à autenticação de utilizadores (login, registo e encerramento de sessão). 

*/

import { Router } from "express";
import { PublicController } from "../controllers/publicController.js";
import { AuthController } from "../controllers/authController.js";
import { apenasVisitante, exigirLogin } from "../middlewares/auth.js";

const router = Router();

// PORTAL PUBLICO
router.get("/", PublicController.home);
router.get("/catalogo", PublicController.catalogo);
router.get("/catalogo/:id", PublicController.detalheEvento);

// AUTENTICAÇÃO DE UTILIZADORES 

// Utiliza o middleware 'apenasVisitante' para impedir que utilizadores já logados acedam às páginas de login/registo
router.get("/login", apenasVisitante, AuthController.telaLogin);
router.post("/login", apenasVisitante, AuthController.login);
router.get("/registro", apenasVisitante, AuthController.telaRegistro);
router.post("/registro", apenasVisitante, AuthController.registrar);

// Utiliza o middleware 'exigirLogin' para garantir que apenas utilizadores autenticados possam terminar sessão
router.post("/logout", exigirLogin, AuthController.logout);

export default router;
