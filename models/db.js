const Sequelize = require("sequelize");

const sequelize = new Sequelize(
    "allocate_db",
    "root",
    "password",
    {
        host:"localhost",
        dialect:"mysql"
    }
    
);

sequelize.authenticate().then((function(){
    console.log("Banco de Dados conectado com sucesso");
})).catch(function(erro){
    console.log("Falha ao se conectar com o banco de dados: " + erro);
});

module.exports = {
    Sequelize: Sequelize,
    sequelize: sequelize
}