import { pool } from './database.js';

export async function inicializarBanco() {
  try {
    console.log('[db] A verificar e criar tabelas no PostgreSQL...');
    
    const schemaSql = `
      CREATE TABLE IF NOT EXISTS perfil_acesso (
          idPerfil SERIAL PRIMARY KEY,
          tipo VARCHAR(250) NOT NULL
      );

      CREATE TABLE IF NOT EXISTS departamento (
          idDepto SERIAL PRIMARY KEY,
          nomeDepto VARCHAR(250) NOT NULL
      );

      CREATE TABLE IF NOT EXISTS login (
          idLogin SERIAL PRIMARY KEY,
          email VARCHAR(250) NOT NULL UNIQUE,
          senha_hash VARCHAR(250) NOT NULL,
          status VARCHAR(20) DEFAULT 'ATIVO' NOT NULL,
          criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          ultimo_login TIMESTAMP NULL,
          CONSTRAINT chk_email_valido CHECK (email LIKE '%@%.%'),
          CONSTRAINT chk_login_status CHECK (status IN ('ativo', 'inativo', 'bloqueado', 'ATIVO', 'INATIVO', 'BLOQUEADO'))
      );

      CREATE TABLE IF NOT EXISTS usuario (
          idUsuario SERIAL PRIMARY KEY,
          nomeCompleto VARCHAR(250) NOT NULL,
          CRM_matricula VARCHAR(250) NOT NULL,
          telefone VARCHAR(250) NOT NULL,
          idPerfil INT NOT NULL,
          idDepto INT NOT NULL,
          idLogin INT NOT NULL,
          status VARCHAR(10) NOT NULL DEFAULT 'ATIVO',
          CONSTRAINT fk_login FOREIGN KEY (idLogin) REFERENCES login(idLogin) ON DELETE CASCADE,
          CONSTRAINT fk_perfil FOREIGN KEY (idPerfil) REFERENCES perfil_acesso(idPerfil),
          CONSTRAINT fk_depto FOREIGN KEY (idDepto) REFERENCES departamento(idDepto),
          CONSTRAINT chk_usuario_status CHECK (status IN ('ATIVO', 'INATIVO'))
      );

      CREATE TABLE IF NOT EXISTS categoria_evento (
          idCatEvento SERIAL PRIMARY KEY,
          categoria VARCHAR(250) NOT NULL,
          descricao VARCHAR(250)
      );

      CREATE TABLE IF NOT EXISTS evento (
          idEvento SERIAL PRIMARY KEY,
          nome VARCHAR(250) NOT NULL,
          data_inicio TIMESTAMP NOT NULL,
          data_termino TIMESTAMP NOT NULL,
          local VARCHAR(250) NOT NULL,
          idCatEvento INT NOT NULL,
          capacidade INT NOT NULL,
          descricao VARCHAR(250),
          custo_estimado DECIMAL(10,2) NOT NULL,
          status VARCHAR(20) NOT NULL DEFAULT 'PLANEJAMENTO',
          CONSTRAINT fk_catEvento FOREIGN KEY (idCatEvento) REFERENCES categoria_evento(idCatEvento),
          CONSTRAINT chk_evento_datas CHECK (data_termino >= data_inicio),
          CONSTRAINT chk_evento_capacidade CHECK (capacidade > 0)
      );

      CREATE TABLE IF NOT EXISTS historico_evento (
          idHistEvento SERIAL PRIMARY KEY,
          nome VARCHAR(250) NOT NULL,
          data_evento TIMESTAMP NOT NULL,
          idCatEvento INT,
          CONSTRAINT fk_catEvento1 FOREIGN KEY (idCatEvento) REFERENCES categoria_evento(idCatEvento)
      );

      CREATE TABLE IF NOT EXISTS tier_inscricao (
          idTier SERIAL PRIMARY KEY,
          idEvento INT NOT NULL,
          nome VARCHAR(250) NOT NULL,
          descricao VARCHAR(250) NULL,
          preco DECIMAL(10,2) NOT NULL,
          capacidade INT NOT NULL,
          prazo DATE NULL,
          status VARCHAR(10) NOT NULL DEFAULT 'RASCUNHO',
          CONSTRAINT fk_tier_evento FOREIGN KEY (idEvento) REFERENCES evento(idEvento) ON DELETE CASCADE,
          CONSTRAINT chk_tier_status CHECK (status IN ('ATIVO', 'RASCUNHO', 'ENCERRADO')),
          CONSTRAINT chk_tier_capacidade CHECK (capacidade > 0)
      );

      CREATE TABLE IF NOT EXISTS inscricao (
          idInscricao SERIAL PRIMARY KEY,
          idEvento INT NOT NULL,
          idUsuario INT NOT NULL,
          idTier INT NOT NULL,
          status VARCHAR(10) NOT NULL DEFAULT 'SOLICITADO',
          data_inscricao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT fk_inscEvento FOREIGN KEY (idEvento) REFERENCES evento(idEvento),
          CONSTRAINT fk_inscUser FOREIGN KEY (idUsuario) REFERENCES usuario(idUsuario),
          CONSTRAINT fk_inscTier FOREIGN KEY (idTier) REFERENCES tier_inscricao(idTier),
          CONSTRAINT chk_inscricao_status CHECK (status IN ('SOLICITADO', 'APROVADO', 'PAGO', 'REJEITADO'))
      );

      CREATE TABLE IF NOT EXISTS ciclo_orcamento (
          idCiclo SERIAL PRIMARY KEY,
          nome VARCHAR(250) NOT NULL UNIQUE,
          limite_total DECIMAL(15,2) NOT NULL,
          status VARCHAR(20) DEFAULT 'ATIVO' NOT NULL,
          CONSTRAINT chk_limite_total_positivo CHECK (limite_total >= 0),
          CONSTRAINT chk_ciclo_status CHECK (status IN ('PLANEJAMENTO', 'ATIVO', 'FECHADO'))
      );

      CREATE TABLE IF NOT EXISTS orcamento_departamento (
          idOrcamentoDepto SERIAL PRIMARY KEY,
          idDepto INT NOT NULL,
          idCiclo INT NOT NULL,
          idUsuario INT NULL,
          limite DECIMAL(12,2) NOT NULL,
          utilizado DECIMAL(12,2) DEFAULT 0.00 NOT NULL,
          CONSTRAINT fk_orc_depto FOREIGN KEY (idDepto) REFERENCES departamento(idDepto),
          CONSTRAINT fk_orc_ciclo FOREIGN KEY (idCiclo) REFERENCES ciclo_orcamento(idCiclo),
          CONSTRAINT fk_orc_lider FOREIGN KEY (idUsuario) REFERENCES usuario(idUsuario),
          CONSTRAINT chk_orc_limite CHECK (limite >= 0),
          CONSTRAINT chk_orc_utilizado CHECK (utilizado >= 0),
          CONSTRAINT uk_depto_ciclo UNIQUE (idDepto, idCiclo)
      );

      CREATE TABLE IF NOT EXISTS cenario_orcamento (
          idCenario SERIAL PRIMARY KEY,
          nome_cenario VARCHAR(250) NOT NULL,
          idCiclo INT NOT NULL,
          custo_base DECIMAL(12,2) NOT NULL DEFAULT 0.00,
          novo_custo_projetado DECIMAL(12,2) NOT NULL DEFAULT 0.00,
          status VARCHAR(20) DEFAULT 'RASCUNHO' NOT NULL,
          criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT fk_cenario_ciclo FOREIGN KEY (idCiclo) REFERENCES ciclo_orcamento(idCiclo),
          CONSTRAINT chk_cenario_status CHECK (status IN ('RASCUNHO', 'APROVADO', 'REJEITADO'))
      );

      CREATE TABLE IF NOT EXISTS item_cenario_orcamento (
          idItemCenario SERIAL PRIMARY KEY,
          idCenario INT NOT NULL,
          funcao VARCHAR(250) NOT NULL,
          tier_nivel VARCHAR(50) NOT NULL,
          quantidade INT NOT NULL,
          custo_mensal_est DECIMAL(10,2) NOT NULL,
          inicio_previsto VARCHAR(7) NULL,
          CONSTRAINT fk_item_cenario FOREIGN KEY (idCenario) REFERENCES cenario_orcamento(idCenario) ON DELETE CASCADE,
          CONSTRAINT chk_item_qtd CHECK (quantidade > 0),
          CONSTRAINT chk_item_custo CHECK (custo_mensal_est >= 0)
      );
    `;

    await pool.query(schemaSql);
    console.log('[db] Estrutura de tabelas garantida com sucesso.');

    // Inserção segura de dados iniciais (Seeds) caso a tabela perfil_acesso esteja vazia
    const [{ count }] = (await pool.query('SELECT COUNT(*) AS count FROM perfil_acesso')).rows;
    if (Number(count) === 0) {
      console.log('[db] A inserir dados iniciais (seeds)...');

      const seedsSql = `
        INSERT INTO perfil_acesso (tipo) VALUES 
        ('Administrador'), 
        ('Usuário');

        INSERT INTO departamento (nomeDepto) VALUES 
        ('Tecnologia (TI)'), 
        ('Marketing'), 
        ('Operações Clínicas');

        INSERT INTO categoria_evento (categoria, descricao) VALUES 
        ('Congresso', 'Congresso anual da especialidade médica'),
        ('Workshop', 'Treinamento prático hands-on'),
        ('Simpósio', 'Apresentação de pesquisas e debates científicos');

        INSERT INTO login (email, senha_hash, status) VALUES 
        ('admin@allocate.com',        '$2b$10$jJzWYAy11Zz7xFSwfzlaGeWIckkbOW9tXAXwuGJ0NZrDDfB7KA7pK', 'ATIVO'),
        ('ana.souza@allocate.com',    '$2b$10$/6.un5QXW5YajSeHgjyX3.QbnTF2HwYRb.BtjfeQV3N87LpEgpmve', 'ATIVO'),
        ('roberto.lima@allocate.com', '$2b$10$/6.un5QXW5YajSeHgjyX3.QbnTF2HwYRb.BtjfeQV3N87LpEgpmve', 'ATIVO'),
        ('carlos.reis@allocate.com',  '$2b$10$/6.un5QXW5YajSeHgjyX3.QbnTF2HwYRb.BtjfeQV3N87LpEgpmve', 'ATIVO');

        INSERT INTO usuario (nomeCompleto, CRM_matricula, telefone, idPerfil, idLogin, idDepto, status) VALUES 
        ('Dr. Carlos Silva', '123456/SP', '(11) 98765-4321', 1, 1, 1, 'ATIVO'),
        ('Dra. Ana Souza', '654321/SP', '(11) 91234-5678', 1, 1, 2, 'ATIVO'),
        ('Roberto Lima', 'MAT-998877', '(11) 99888-7766', 1, 2, 3, 'ATIVO');

        INSERT INTO evento (nome, data_inicio, data_termino, local, idCatEvento, capacidade, descricao, custo_estimado) VALUES 
        ('Congresso Paulista de Cardiologia', '2026-06-10 08:00:00', '2026-06-12 18:00:00', 'Centro de Convenções Rebouças', 1, 150, 'Foco em novas tecnologias cardiológicas', 50000.00),
        ('Workshop de Ressuscitação Pediátrica', '2026-07-15 09:00:00', '2026-07-15 17:00:00', 'Hospital das Clínicas - Auditório Principal', 2, 30, 'Prática avançada em manequins', 8000.00),
        ('Simpósio de Neurociências', '2026-08-20 08:30:00', '2026-08-21 17:30:00', 'Hotel Maksoud Plaza', 3, 100, 'Avanços no tratamento de AVC', 25000.00);

        INSERT INTO historico_evento (nome, data_evento, idCatEvento) VALUES 
        ('Congresso Paulista de Cardiologia 2025', '2025-06-10 08:00:00', 1),
        ('Workshop Pediátrico Anterior', '2025-05-10 09:00:00', 2),
        ('Simpósio de Neurociências 2025', '2025-09-12 08:30:00', 3);

        INSERT INTO tier_inscricao (idEvento, nome, preco, capacidade, status) VALUES 
        (1, 'Profissional / Médico', 350.00, 100, 'ATIVO'),
        (1, 'Estudante / Residente', 150.00, 40, 'ATIVO'),
        (1, 'VIP / Convidado', 0.00, 10, 'ATIVO');

        INSERT INTO inscricao (idEvento, idUsuario, idTier, status) VALUES 
        (1, 1, 1, 'APROVADO'),
        (1, 2, 2, 'PAGO'),
        (2, 1, 3, 'SOLICITADO');

        INSERT INTO ciclo_orcamento (nome, limite_total, status) VALUES 
        ('Q3 2024', 5000000.00, 'FECHADO'),
        ('Q4 2024', 6200000.00, 'ATIVO'),
        ('Q1 2025', 7000000.00, 'PLANEJAMENTO');

        INSERT INTO orcamento_departamento (idDepto, idCiclo, idUsuario, limite, utilizado) VALUES 
        (1, 2, NULL, 2500000.00, 2400000.00),
        (2, 2, NULL, 1200000.00, 1000000.00),
        (3, 2, NULL, 2500000.00, 1250000.00);

        INSERT INTO cenario_orcamento (nome_cenario, idCiclo, custo_base, novo_custo_projetado, status) VALUES 
        ('Crescimento Agressivo Q4', 2, 6200000.00, 6650000.00, 'RASCUNHO'),
        ('Expansão de Equipe Médica', 2, 6200000.00, 6800000.00, 'APROVADO'),
        ('Cenário de Contingência Q1', 3, 7000000.00, 6500000.00, 'RASCUNHO');

        INSERT INTO item_cenario_orcamento (idCenario, funcao, tier_nivel, quantidade, custo_mensal_est, inicio_previsto) VALUES 
        (1, 'Médico Especialista', 'Tier 3', 2, 24000.00, '2024-11'),
        (1, 'Enfermeiro Chefe', 'Tier 2', 5, 35000.00, '2024-12'),
        (2, 'Técnico de TI', 'Tier 1', 1, 4500.00, '2024-10');
      `;

      await pool.query(seedsSql);
      console.log('[db] Dados iniciais inseridos com sucesso!');
    } else {
      console.log('[db] O banco já possui dados cadastrados. Ignorando seeds.');
    }

  } catch (err) {
    console.error('[db] Erro ao preparar o banco:', err.message);
    throw err;
  }
}