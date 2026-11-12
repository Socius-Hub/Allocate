/*

	Allocate dados iniciais - (funciona em PostgreSQL e MySQL)
    
    Proj. de Extensão III - 4° Bimestre TADs - 2026

    OBS: Este script insere dados iniciais de teste no banco de dados para o sistema Allocate, incluindo perfis de acesso, departamentos, categorias de eventos, usuários, eventos, inscrições e orçamentos.



    Usuários de teste:
        admin@allocate.com        / admin123  (Administrador)
        ana.souza@allocate.com    / senha123  (Usuário)
        roberto.lima@allocate.com / senha123  (Usuário)
        carlos.reis@allocate.com  / senha123  (Usuário)
  
*/


-- Perfil de Acesso
INSERT INTO perfil_acesso (tipo) VALUES 
('Administrador'), 
('Usuário');

-- Departamento
INSERT INTO departamento (nomeDepto) VALUES 
('Tecnologia (TI)'), 
('Marketing'), 
('Operações Clínicas');

-- Categoria de Evento
INSERT INTO categoria_evento (categoria, descricao) VALUES 
('Congresso', 'Congresso anual da especialidade médica'),
('Workshop', 'Treinamento prático hands-on'),
('Simpósio', 'Apresentação de pesquisas e debates científicos');

-- Login
INSERT INTO login (email, senha_hash, status) VALUES 
('admin@allocate.com',        '$2b$10$jJzWYAy11Zz7xFSwfzlaGeWIckkbOW9tXAXwuGJ0NZrDDfB7KA7pK', 'ATIVO'),
('ana.souza@allocate.com',    '$2b$10$/6.un5QXW5YajSeHgjyX3.QbnTF2HwYRb.BtjfeQV3N87LpEgpmve', 'ATIVO'),
('roberto.lima@allocate.com', '$2b$10$/6.un5QXW5YajSeHgjyX3.QbnTF2HwYRb.BtjfeQV3N87LpEgpmve', 'ATIVO'),
('carlos.reis@allocate.com',  '$2b$10$/6.un5QXW5YajSeHgjyX3.QbnTF2HwYRb.BtjfeQV3N87LpEgpmve', 'ATIVO');

-- Usuários
INSERT INTO usuario (nomeCompleto, CRM_matricula, telefone, idPerfil, idLogin, idDepto, status) VALUES 
('Dr. Carlos Silva', '123456/SP', '(11) 98765-4321', 1, 1, 1, 'ATIVO'),
('Dra. Ana Souza', '654321/SP', '(11) 91234-5678', 1, 1, 2, 'ATIVO'),
('Roberto Lima', 'MAT-998877', '(11) 99888-7766', 1, 2, 3, 'ATIVO');

-- Eventos
INSERT INTO evento (nome, data_inicio, data_termino, local, idCatEvento, capacidade, descricao, custo_estimado) VALUES 
('Congresso Paulista de Cardiologia', '2026-06-10 08:00:00', '2026-06-12 18:00:00', 'Centro de Convenções Rebouças', 1, 150, 'Foco em novas tecnologias cardiológicas', 50000.00),
('Workshop de Ressuscitação Pediátrica', '2026-07-15 09:00:00', '2026-07-15 17:00:00', 'Hospital das Clínicas - Auditório Principal', 2, 30, 'Prática avançada em manequins', 8000.00),
('Simpósio de Neurociências', '2026-08-20 08:30:00', '2026-08-21 17:30:00', 'Hotel Maksoud Plaza', 3, 100, 'Avanços no tratamento de AVC', 25000.00);

-- Histórico de Eventos
INSERT INTO historico_evento (nome, data_evento, idCatEvento) VALUES 
('Congresso Paulista de Cardiologia 2025', '2025-06-10 08:00:00', 1),
('Workshop Pediátrico Anterior', '2025-05-10 09:00:00', 2),
('Simpósio de Neurociências 2025', '2025-09-12 08:30:00', 3);

-- Tier de Inscrição
INSERT INTO tier_inscricao (nome, preco, capacidade, status) VALUES 
('Profissional / Médico', 350.00, 100, 'ATIVO'),
('Estudante / Residente', 150.00, 40, 'ATIVO'),
('VIP / Convidado', 0.00, 10, 'ATIVO');

-- Inscrições
INSERT INTO inscricao (idEvento, idUsuario, idTier, status) VALUES 
(1, 1, 1, 'APROVADO'),
(1, 2, 2, 'PAGO'),
(2, 1, 3, 'SOLICITADO');

-- ciclo_orcamento
INSERT INTO ciclo_orcamento (nome, limite_total, status) VALUES 
('Q3 2024', 5000000.00, 'FECHADO'),
('Q4 2024', 6200000.00, 'ATIVO'),
('Q1 2025', 7000000.00, 'PLANEJAMENTO');

-- orcamento_departamento
INSERT INTO orcamento_departamento (idDepto, idCiclo, idUsuario, limite, utilizado) VALUES 
(1, 2, NULL, 2500000.00, 2400000.00),
(2, 2, NULL, 1200000.00, 1000000.00),
(3, 2, NULL, 2500000.00, 1250000.00);

-- cenario_orcamento
INSERT INTO cenario_orcamento (nome_cenario, idCiclo, custo_base, novo_custo_projetado, status) VALUES 
('Crescimento Agressivo Q4', 2, 6200000.00, 6650000.00, 'RASCUNHO'),
('Expansão de Equipe Médica', 2, 6200000.00, 6800000.00, 'APROVADO'),
('Cenário de Contingência Q1', 3, 7000000.00, 6500000.00, 'RASCUNHO');

-- item_cenario_orcamento
INSERT INTO item_cenario_orcamento (idCenario, funcao, tier_nivel, quantidade, custo_mensal_est, inicio_previsto) VALUES 
(1, 'Médico Especialista', 'Tier 3', 2, 24000.00, '2024-11'),
(1, 'Enfermeiro Chefe', 'Tier 2', 5, 35000.00, '2024-12'),
(2, 'Técnico de TI', 'Tier 1', 1, 4500.00, '2024-10');