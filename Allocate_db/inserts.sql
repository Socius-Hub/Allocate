-- 1. Perfil de Acesso
INSERT INTO perfil_acesso (tipo) VALUES 
('Usuário'),
('Administrador');

-- 2. Departamento
INSERT INTO departamento (nomeDepto) VALUES 
('Cardiologia'),
('Pediatria'),
('Neurologia');

-- 3. Categoria de Evento
INSERT INTO categoria_evento (categoria, descricao) VALUES 
('Congresso', 'Congresso anual da especialidade médica'),
('Workshop', 'Treinamento prático hands-on'),
('Simpósio', 'Apresentação de pesquisas e debates científicos');

-- 4. Usuários
INSERT INTO usuario (nomeCompleto, CRM_matricula, telefone, idPerfil, idDepto, status) VALUES 
('Dr. Carlos Silva', '123456/SP', '(11) 98765-4321', 1, 1, 'ATIVO'),
('Dra. Ana Souza', '654321/SP', '(11) 91234-5678', 1, 2, 'ATIVO'),
('Roberto Lima', 'MAT-998877', '(11) 99888-7766', 2, 3, 'ATIVO');

-- 5. Eventos
INSERT INTO evento (nome, data_inicio, data_termino, local, idCatEvento, capacidade, descricao, custo_estimado) VALUES 
('Congresso Paulista de Cardiologia', '2026-06-10 08:00:00', '2026-06-12 18:00:00', 'Centro de Convenções Rebouças', 1, 150, 'Foco em novas tecnologias cardiológicas', 50000.00),
('Workshop de Ressuscitação Pediátrica', '2026-07-15 09:00:00', '2026-07-15 17:00:00', 'Hospital das Clínicas - Auditório Principal', 2, 30, 'Prática avançada em manequins', 8000.00),
('Simpósio de Neurociências', '2026-08-20 08:30:00', '2026-08-21 17:30:00', 'Hotel Maksoud Plaza', 3, 100, 'Avanços no tratamento de AVC', 25000.00);

-- 6. Histórico de Eventos
INSERT INTO historico_evento (nome, data_evento, idCatEvento) VALUES 
('Congresso Paulista de Cardiologia 2025', '2025-06-10 08:00:00', 1),
('Workshop Pediátrico Anterior', '2025-05-10 09:00:00', 2),
('Simpósio de Neurociências 2025', '2025-09-12 08:30:00', 3);

-- 7. Tier de Inscrição
INSERT INTO tier_inscricao (nome, preco, capacidade, status) VALUES 
('Profissional / Médico', 350.00, 100, 'ATIVO'),
('Estudante / Residente', 150.00, 40, 'ATIVO'),
('VIP / Convidado', 0.00, 10, 'ATIVO');

-- 8. Inscrições
INSERT INTO inscricao (idEvento, idUsuario, idTier, status) VALUES 
(1, 1, 1, 'APROVADO'),
(1, 2, 2, 'PAGO'),
(2, 1, 3, 'SOLICITADO');