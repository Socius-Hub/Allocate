DROP DATABASE IF EXISTS allocate_db;
CREATE DATABASE allocate_db;

USE allocate_db;

CREATE TABLE perfil_acesso(
	idPerfil int PRIMARY KEY auto_increment,
    tipo varchar(100) NOT NULL
);

CREATE TABLE departamento(
	idDepto int PRIMARY KEY auto_increment,
    nomeDepto varchar(100) NOT NULL
);

CREATE TABLE usuario(
	idUsuario int PRIMARY KEY auto_increment,
    nomeCompleto varchar(100) NOT NULL,
    CRM_matricula int NOT NULL,
    telefone int NOT NULL,
    idPerfil int NOT NULL,
    idDepto int NOT NULL,
    status char not null,
    CONSTRAINT fk_perfil foreign key (idPerfil) REFERENCES perfil_acesso(idPerfil),
    CONSTRAINT fk_depto foreign key (idDepto) REFERENCES departamento(idDepto)
);

CREATE TABLE categoria_evento(
	idCatEvento int PRIMARY KEY auto_increment,
    categoria varchar(100) NOT NULL,
    descricao varchar(100)
);

CREATE TABLE evento(
	idEvento int PRIMARY KEY auto_increment,
    nome varchar(100) NOT NULL,
    data_inicio datetime NOT NULL,
    data_termino datetime NOT NULL,
    local varchar(100) NOT NULL,
    idCatEvento int not null,
    capacidade int not null,
    descricao varchar(100),
    custo_estimado decimal(2,0) not null,
	CONSTRAINT fk_catEvento foreign key (idCatEvento) REFERENCES categoria_evento(idCatEvento)
);

CREATE TABLE historico_evento(
	idHistEvento int PRIMARY KEY auto_increment,
    nome varchar(100) NOT NULL,
    data_evento datetime not null,
    idCatEvento int,
    CONSTRAINT fk_catEvento1 foreign key (idCatEvento) REFERENCES categoria_evento(idCatEvento)
);

CREATE TABLE tier_inscricao(
	idTier int PRIMARY KEY auto_increment,
    nome varchar(100) NOT NULL,
    preco decimal(2,0) NOT NULL,
    capacidade int not null,
    status char not null
);

CREATE TABLE inscricao(
	idInscricao int PRIMARY KEY auto_increment,
    idEvento int not null, # tem que estar com o status ativo
    idUsuario int not null,
    idTier int,
	CONSTRAINT fk_inscEvento foreign key (idEvento) REFERENCES evento(idEvento),
    CONSTRAINT fk_inscUser foreign key (idUsuario) REFERENCES usuario(idUsuario),
    CONSTRAINT fk_inscTier foreign key (idTier) REFERENCES tier_inscricao(idTier)
);
