import { Router } from 'express';
import { LoginController } from '../controllers/loginController.js';

const router = Router();

// Listar todos
router.get('/', LoginController.getAllLogins);

// Buscar apenas um por ID
router.get('/:id', LoginController.getLoginById);

// Criar novo
router.post('/', LoginController.createLogin);

// Atualizar login existente (PUT)
router.put('/:id', LoginController.updateLogin);

// Excluir login (DELETE)
router.delete('/:id', LoginController.deleteLogin);

export default router;