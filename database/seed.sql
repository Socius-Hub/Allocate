-- =====================================================================
-- ALLOCATE - Dados iniciais (funciona em PostgreSQL e MySQL)
--
-- Usuários de teste:
--   admin@allocate.com        / admin123  (Administrador)
--   ana.souza@allocate.com    / senha123  (Usuário)
--   roberto.lima@allocate.com / senha123  (Usuário)
--   carlos.reis@allocate.com  / senha123  (Usuário)
-- =====================================================================

INSERT INTO perfil_acesso (tipo) VALUES ('Administrador'), ('Usuário');

INSERT INTO departamento (nome_depto, descricao) VALUES
('Tecnologia (TI)',     'Infraestrutura e sistemas'),
('Marketing',           'Comunicação e relacionamento'),
('Operações Clínicas',  'Atendimento e unidades assistenciais'),
('Cardiologia',         'Centro de Especialidades'),
('Recursos Humanos',    'Gestão de pessoas e treinamentos');

INSERT INTO categoria_evento (categoria, descricao) VALUES
('Congresso',   'Congresso anual da especialidade médica'),
('Workshop',    'Treinamento prático hands-on'),
('Simpósio',    'Apresentação de pesquisas e debates científicos'),
('Treinamento', 'Capacitação interna de equipes');

INSERT INTO login (email, senha_hash, status) VALUES
('admin@allocate.com',        '$2b$10$jJzWYAy11Zz7xFSwfzlaGeWIckkbOW9tXAXwuGJ0NZrDDfB7KA7pK', 'ATIVO'),
('ana.souza@allocate.com',    '$2b$10$/6.un5QXW5YajSeHgjyX3.QbnTF2HwYRb.BtjfeQV3N87LpEgpmve', 'ATIVO'),
('roberto.lima@allocate.com', '$2b$10$/6.un5QXW5YajSeHgjyX3.QbnTF2HwYRb.BtjfeQV3N87LpEgpmve', 'ATIVO'),
('carlos.reis@allocate.com',  '$2b$10$/6.un5QXW5YajSeHgjyX3.QbnTF2HwYRb.BtjfeQV3N87LpEgpmve', 'ATIVO');

INSERT INTO usuario (nome_completo, crm_matricula, telefone, cargo, id_perfil, id_depto, id_login, status) VALUES
('Dra. Maria Silva', '123456/SP',  '(19) 98765-4321', 'Coordenadora Médica',    1, 3, 1, 'ATIVO'),
('Dra. Ana Souza',   '654321/SP',  '(11) 91234-5678', 'Cardiologista',          2, 4, 2, 'ATIVO'),
('Roberto Lima',     'MAT-998877', '(11) 99888-7766', 'Analista de Sistemas',   2, 1, 3, 'ATIVO'),
('Dr. Carlos Reis',  '777888/SP',  '(11) 97777-1111', 'Gerente de Marketing',   2, 2, 4, 'ATIVO');

INSERT INTO evento (nome, data_inicio, data_termino, localizacao, id_cat_evento, id_depto, capacidade, descricao, custo_estimado, status) VALUES
('Congresso Paulista de Cardiologia',     '2027-03-10 08:00:00', '2027-03-12 18:00:00', 'Centro de Convenções Rebouças - São Paulo, SP', 1, 4, 150, 'Foco em novas tecnologias cardiológicas, com palestras, workshops e área de exposição.', 50000.00, 'ATIVO'),
('Workshop de Ressuscitação Pediátrica',  '2026-12-05 09:00:00', '2026-12-05 17:00:00', 'Hospital das Clínicas - Auditório Principal', 2, 3, 30, 'Prática avançada em manequins com instrutores certificados.', 8000.00, 'ATIVO'),
('Simpósio de Neurociências',             '2027-05-20 08:30:00', '2027-05-21 17:30:00', 'Hotel Maksoud Plaza - São Paulo, SP', 3, 3, 100, 'Avanços no tratamento de AVC e doenças neurodegenerativas.', 25000.00, 'PLANEJAMENTO'),
('Treinamento de Liderança 2026',         '2026-09-15 09:00:00', '2026-09-15 18:00:00', 'Sede Campinas - Sala 3', 4, 5, 20, 'Capacitação de líderes de equipe.', 3200.00, 'CONCLUIDO');

INSERT INTO tier_inscricao (id_evento, nome, descricao, preco, capacidade, prazo, status) VALUES
(1, 'Profissional / Médico', 'Acesso total ao congresso',              350.00, 100, '2027-02-28', 'ATIVO'),
(1, 'Estudante / Residente', 'Acesso às palestras principais',         150.00,  40, '2027-02-28', 'ATIVO'),
(1, 'VIP / Palestrante',     'Cobertura total + hospedagem',             0.00,  10, NULL,         'ATIVO'),
(2, 'Inscrição Geral',       'Material e certificado inclusos',        200.00,  30, '2026-11-30', 'ATIVO'),
(3, 'Early Bird',            'Valor promocional para os primeiros',    280.00,  50, '2027-03-31', 'RASCUNHO'),
(4, 'Líderes',               'Turma única',                              0.00,  20, NULL,         'ENCERRADO');

INSERT INTO inscricao (id_evento, id_usuario, id_tier, valor, status, justificativa) VALUES
(1, 2, 1, 350.00, 'APROVADO',   'Atualização em novas técnicas de cardiologia intervencionista.'),
(1, 3, 2, 150.00, 'SOLICITADO', 'Apoio técnico à equipe de TI do evento.'),
(2, 2, 4, 200.00, 'SOLICITADO', 'Reciclagem obrigatória de suporte pediátrico.'),
(2, 4, 4, 200.00, 'PAGO',       'Cobertura de marketing do workshop.'),
(4, 1, 6,   0.00, 'APROVADO',   'Treinamento de liderança da coordenação.');

INSERT INTO ciclo_orcamento (nome, limite_total, status) VALUES
('Q3 2026', 5000000.00, 'FECHADO'),
('Q4 2026', 6200000.00, 'ATIVO'),
('Q1 2027', 7000000.00, 'PLANEJAMENTO');

INSERT INTO orcamento_departamento (id_depto, id_ciclo, id_usuario, limite, utilizado) VALUES
(1, 2, 3,    2500000.00, 2400000.00),
(2, 2, 4,    1200000.00, 1000000.00),
(3, 2, 1,    1500000.00,  750000.00),
(4, 2, 2,     700000.00,  420350.00),
(5, 2, NULL,  300000.00,  120000.00),
(1, 1, 3,    2000000.00, 1950000.00),
(3, 1, 1,    1400000.00, 1300000.00);

INSERT INTO cenario_orcamento (nome_cenario, id_ciclo, custo_base, status) VALUES
('Crescimento Agressivo Q4',   2, 1200000.00, 'RASCUNHO'),
('Expansão de Equipe Médica',  2, 1200000.00, 'APROVADO'),
('Cenário de Contingência Q1', 3, 1350000.00, 'RASCUNHO');

INSERT INTO item_cenario_orcamento (id_cenario, funcao, tier_nivel, quantidade, custo_mensal_est, inicio_previsto) VALUES
(1, 'Médico Especialista', 'Tier 3', 2, 24000.00, '2026-11'),
(1, 'Enfermeiro Chefe',    'Tier 2', 5,  7000.00, '2026-12'),
(1, 'Técnico de TI',       'Tier 1', 1,  4500.00, '2026-12'),
(2, 'Médico Especialista', 'Tier 4', 3, 30000.00, '2026-10');
