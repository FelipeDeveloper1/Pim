using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace FinanceControl.Web.Migrations;

[Microsoft.EntityFrameworkCore.Infrastructure.DbContext(typeof(FinanceControl.Web.Data.ApplicationDbContext))]
[Microsoft.EntityFrameworkCore.Migrations.Migration("20240602000000_InitialCreate")]
public partial class InitialCreate : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.CreateTable(
            name: "Usuarios",
            columns: table => new
            {
                Id = table.Column<int>(type: "int", nullable: false)
                    .Annotation("SqlServer:Identity", "1, 1"),
                NomeCompleto = table.Column<string>(type: "nvarchar(120)", maxLength: 120, nullable: false),
                NomeUsuario = table.Column<string>(type: "nvarchar(60)", maxLength: 60, nullable: false),
                Email = table.Column<string>(type: "nvarchar(120)", maxLength: 120, nullable: false),
                SenhaHash = table.Column<string>(type: "nvarchar(256)", maxLength: 256, nullable: false),
                Perfil = table.Column<int>(type: "int", nullable: false),
                Ativo = table.Column<bool>(type: "bit", nullable: false),
                DataCadastro = table.Column<DateTime>(type: "datetime2", nullable: false)
            },
            constraints: table => table.PrimaryKey("PK_Usuarios", x => x.Id));

        migrationBuilder.CreateIndex(name: "IX_Usuarios_Email", table: "Usuarios", column: "Email", unique: true);
        migrationBuilder.CreateIndex(name: "IX_Usuarios_NomeUsuario", table: "Usuarios", column: "NomeUsuario", unique: true);

        migrationBuilder.CreateTable(
            name: "Categorias",
            columns: table => new
            {
                Id = table.Column<int>(type: "int", nullable: false)
                    .Annotation("SqlServer:Identity", "1, 1"),
                Nome = table.Column<string>(type: "nvarchar(80)", maxLength: 80, nullable: false),
                Tipo = table.Column<int>(type: "int", nullable: false),
                UsuarioId = table.Column<int>(type: "int", nullable: false)
            },
            constraints: table =>
            {
                table.PrimaryKey("PK_Categorias", x => x.Id);
                table.ForeignKey(name: "FK_Categorias_Usuarios_UsuarioId", column: x => x.UsuarioId, principalTable: "Usuarios", principalColumn: "Id", onDelete: ReferentialAction.Cascade);
            });

        migrationBuilder.CreateTable(
            name: "Contas",
            columns: table => new
            {
                Id = table.Column<int>(type: "int", nullable: false)
                    .Annotation("SqlServer:Identity", "1, 1"),
                Nome = table.Column<string>(type: "nvarchar(80)", maxLength: 80, nullable: false),
                Descricao = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: true),
                SaldoInicial = table.Column<decimal>(type: "decimal(18,2)", precision: 18, scale: 2, nullable: false),
                Ativa = table.Column<bool>(type: "bit", nullable: false),
                UsuarioId = table.Column<int>(type: "int", nullable: false)
            },
            constraints: table =>
            {
                table.PrimaryKey("PK_Contas", x => x.Id);
                table.ForeignKey(name: "FK_Contas_Usuarios_UsuarioId", column: x => x.UsuarioId, principalTable: "Usuarios", principalColumn: "Id", onDelete: ReferentialAction.Cascade);
            });

        migrationBuilder.CreateTable(
            name: "Funcionarios",
            columns: table => new
            {
                Id = table.Column<int>(type: "int", nullable: false)
                    .Annotation("SqlServer:Identity", "1, 1"),
                Nome = table.Column<string>(type: "nvarchar(120)", maxLength: 120, nullable: false),
                Cargo = table.Column<string>(type: "nvarchar(80)", maxLength: 80, nullable: true),
                Salario = table.Column<decimal>(type: "decimal(18,2)", precision: 18, scale: 2, nullable: false),
                DataAdmissao = table.Column<DateTime>(type: "datetime2", nullable: false),
                Ativo = table.Column<bool>(type: "bit", nullable: false),
                UsuarioId = table.Column<int>(type: "int", nullable: false)
            },
            constraints: table =>
            {
                table.PrimaryKey("PK_Funcionarios", x => x.Id);
                table.ForeignKey(name: "FK_Funcionarios_Usuarios_UsuarioId", column: x => x.UsuarioId, principalTable: "Usuarios", principalColumn: "Id", onDelete: ReferentialAction.Cascade);
            });

        migrationBuilder.CreateTable(
            name: "LancamentosFinanceiros",
            columns: table => new
            {
                Id = table.Column<int>(type: "int", nullable: false)
                    .Annotation("SqlServer:Identity", "1, 1"),
                Tipo = table.Column<int>(type: "int", nullable: false),
                Valor = table.Column<decimal>(type: "decimal(18,2)", precision: 18, scale: 2, nullable: false),
                Observacao = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: true),
                Data = table.Column<DateTime>(type: "datetime2", nullable: false),
                UsuarioId = table.Column<int>(type: "int", nullable: false)
            },
            constraints: table =>
            {
                table.PrimaryKey("PK_LancamentosFinanceiros", x => x.Id);
                table.ForeignKey(name: "FK_LancamentosFinanceiros_Usuarios_UsuarioId", column: x => x.UsuarioId, principalTable: "Usuarios", principalColumn: "Id", onDelete: ReferentialAction.Cascade);
            });

        migrationBuilder.CreateTable(
            name: "Metas",
            columns: table => new
            {
                Id = table.Column<int>(type: "int", nullable: false)
                    .Annotation("SqlServer:Identity", "1, 1"),
                Titulo = table.Column<string>(type: "nvarchar(120)", maxLength: 120, nullable: false),
                ValorAlvo = table.Column<decimal>(type: "decimal(18,2)", precision: 18, scale: 2, nullable: false),
                ValorAtual = table.Column<decimal>(type: "decimal(18,2)", precision: 18, scale: 2, nullable: false),
                DataLimite = table.Column<DateTime>(type: "datetime2", nullable: true),
                Concluida = table.Column<bool>(type: "bit", nullable: false),
                UsuarioId = table.Column<int>(type: "int", nullable: false)
            },
            constraints: table =>
            {
                table.PrimaryKey("PK_Metas", x => x.Id);
                table.ForeignKey(name: "FK_Metas_Usuarios_UsuarioId", column: x => x.UsuarioId, principalTable: "Usuarios", principalColumn: "Id", onDelete: ReferentialAction.Cascade);
            });

        migrationBuilder.CreateTable(
            name: "Despesas",
            columns: table => new
            {
                Id = table.Column<int>(type: "int", nullable: false)
                    .Annotation("SqlServer:Identity", "1, 1"),
                Descricao = table.Column<string>(type: "nvarchar(120)", maxLength: 120, nullable: false),
                Valor = table.Column<decimal>(type: "decimal(18,2)", precision: 18, scale: 2, nullable: false),
                Data = table.Column<DateTime>(type: "datetime2", nullable: false),
                UsuarioId = table.Column<int>(type: "int", nullable: false),
                CategoriaId = table.Column<int>(type: "int", nullable: false),
                ContaId = table.Column<int>(type: "int", nullable: false)
            },
            constraints: table =>
            {
                table.PrimaryKey("PK_Despesas", x => x.Id);
                table.ForeignKey(name: "FK_Despesas_Categorias_CategoriaId", column: x => x.CategoriaId, principalTable: "Categorias", principalColumn: "Id", onDelete: ReferentialAction.Restrict);
                table.ForeignKey(name: "FK_Despesas_Contas_ContaId", column: x => x.ContaId, principalTable: "Contas", principalColumn: "Id", onDelete: ReferentialAction.Restrict);
                table.ForeignKey(name: "FK_Despesas_Usuarios_UsuarioId", column: x => x.UsuarioId, principalTable: "Usuarios", principalColumn: "Id", onDelete: ReferentialAction.Cascade);
            });

        migrationBuilder.CreateTable(
            name: "Movimentacoes",
            columns: table => new
            {
                Id = table.Column<int>(type: "int", nullable: false)
                    .Annotation("SqlServer:Identity", "1, 1"),
                Descricao = table.Column<string>(type: "nvarchar(120)", maxLength: 120, nullable: false),
                Valor = table.Column<decimal>(type: "decimal(18,2)", precision: 18, scale: 2, nullable: false),
                Tipo = table.Column<int>(type: "int", nullable: false),
                Data = table.Column<DateTime>(type: "datetime2", nullable: false),
                UsuarioId = table.Column<int>(type: "int", nullable: false),
                ContaId = table.Column<int>(type: "int", nullable: false)
            },
            constraints: table =>
            {
                table.PrimaryKey("PK_Movimentacoes", x => x.Id);
                table.ForeignKey(name: "FK_Movimentacoes_Contas_ContaId", column: x => x.ContaId, principalTable: "Contas", principalColumn: "Id", onDelete: ReferentialAction.Restrict);
                table.ForeignKey(name: "FK_Movimentacoes_Usuarios_UsuarioId", column: x => x.UsuarioId, principalTable: "Usuarios", principalColumn: "Id", onDelete: ReferentialAction.Cascade);
            });

        migrationBuilder.CreateTable(
            name: "Receitas",
            columns: table => new
            {
                Id = table.Column<int>(type: "int", nullable: false)
                    .Annotation("SqlServer:Identity", "1, 1"),
                Descricao = table.Column<string>(type: "nvarchar(120)", maxLength: 120, nullable: false),
                Valor = table.Column<decimal>(type: "decimal(18,2)", precision: 18, scale: 2, nullable: false),
                Data = table.Column<DateTime>(type: "datetime2", nullable: false),
                UsuarioId = table.Column<int>(type: "int", nullable: false),
                CategoriaId = table.Column<int>(type: "int", nullable: false),
                ContaId = table.Column<int>(type: "int", nullable: false)
            },
            constraints: table =>
            {
                table.PrimaryKey("PK_Receitas", x => x.Id);
                table.ForeignKey(name: "FK_Receitas_Categorias_CategoriaId", column: x => x.CategoriaId, principalTable: "Categorias", principalColumn: "Id", onDelete: ReferentialAction.Restrict);
                table.ForeignKey(name: "FK_Receitas_Contas_ContaId", column: x => x.ContaId, principalTable: "Contas", principalColumn: "Id", onDelete: ReferentialAction.Restrict);
                table.ForeignKey(name: "FK_Receitas_Usuarios_UsuarioId", column: x => x.UsuarioId, principalTable: "Usuarios", principalColumn: "Id", onDelete: ReferentialAction.Cascade);
            });

        migrationBuilder.CreateIndex(name: "IX_Categorias_UsuarioId", table: "Categorias", column: "UsuarioId");
        migrationBuilder.CreateIndex(name: "IX_Contas_UsuarioId", table: "Contas", column: "UsuarioId");
        migrationBuilder.CreateIndex(name: "IX_Despesas_CategoriaId", table: "Despesas", column: "CategoriaId");
        migrationBuilder.CreateIndex(name: "IX_Despesas_ContaId", table: "Despesas", column: "ContaId");
        migrationBuilder.CreateIndex(name: "IX_Despesas_UsuarioId", table: "Despesas", column: "UsuarioId");
        migrationBuilder.CreateIndex(name: "IX_Funcionarios_UsuarioId", table: "Funcionarios", column: "UsuarioId");
        migrationBuilder.CreateIndex(name: "IX_LancamentosFinanceiros_UsuarioId", table: "LancamentosFinanceiros", column: "UsuarioId");
        migrationBuilder.CreateIndex(name: "IX_Metas_UsuarioId", table: "Metas", column: "UsuarioId");
        migrationBuilder.CreateIndex(name: "IX_Movimentacoes_ContaId", table: "Movimentacoes", column: "ContaId");
        migrationBuilder.CreateIndex(name: "IX_Movimentacoes_UsuarioId", table: "Movimentacoes", column: "UsuarioId");
        migrationBuilder.CreateIndex(name: "IX_Receitas_CategoriaId", table: "Receitas", column: "CategoriaId");
        migrationBuilder.CreateIndex(name: "IX_Receitas_ContaId", table: "Receitas", column: "ContaId");
        migrationBuilder.CreateIndex(name: "IX_Receitas_UsuarioId", table: "Receitas", column: "UsuarioId");
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropTable(name: "Despesas");
        migrationBuilder.DropTable(name: "Funcionarios");
        migrationBuilder.DropTable(name: "LancamentosFinanceiros");
        migrationBuilder.DropTable(name: "Metas");
        migrationBuilder.DropTable(name: "Movimentacoes");
        migrationBuilder.DropTable(name: "Receitas");
        migrationBuilder.DropTable(name: "Categorias");
        migrationBuilder.DropTable(name: "Contas");
        migrationBuilder.DropTable(name: "Usuarios");
    }
}
