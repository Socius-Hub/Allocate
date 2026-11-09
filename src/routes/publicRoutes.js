/**
 * ROTAS PÚBLICAS — acessíveis por qualquer visitante, sem login.
 */
import { Router } from 'express';
import { PublicController } from '../controllers/publicController.js';
import { AuthController } from '../controllers/authController.js';
import { apenasVisitante, exigirLogin } from '../middlewares/auth.js';

const router = Router();

router.get('/', PublicController.home);
router.get('/catalogo', PublicController.catalogo);
router.get('/catalogo/:id', PublicController.detalheEvento);

router.get('/login', apenasVisitante, AuthController.telaLogin);
router.post('/login', apenasVisitante, AuthController.login);
router.get('/registro', apenasVisitante, AuthController.telaRegistro);
router.post('/registro', apenasVisitante, AuthController.registrar);
router.post('/logout', exigirLogin, AuthController.logout);

export default router;