using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

#pragma warning disable CA1814 // Prefer jagged arrays over multidimensional

namespace Kanban.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddColumnsEntity : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // NOTE (manually edited after scaffolding): EF Core scaffolded this as a plain
            // RenameColumn ("Column" -> "ColumnId") because the CLR type didn't change (both
            // are `int`). A plain rename would silently corrupt data: the old column stored the
            // BoardColumn enum's underlying int (Backlog=0, ToDo=1, InProgress=2, Done=3), but
            // the new Columns table's seeded primary keys are 1..4 (Backlog=1, ToDo=2,
            // InProgress=3, Done=4) - i.e. every existing task's column would silently shift to
            // the WRONG column (e.g. a ToDo task with old value 1 would end up pointing at
            // Columns.Id=1, which is Backlog) instead of failing loudly. We rename first (no
            // data loss), seed the new Columns table, explicitly backfill every existing row
            // with "+1" to re-map the old enum ints onto the new seeded ids, and only then add
            // the FK constraint - so if the backfill were ever wrong, the FK add would fail
            // fast instead of persisting bad references.
            migrationBuilder.RenameColumn(
                name: "Column",
                table: "Tasks",
                newName: "ColumnId");

            migrationBuilder.RenameIndex(
                name: "IX_Tasks_Column_Position",
                table: "Tasks",
                newName: "IX_Tasks_ColumnId_Position");

            migrationBuilder.CreateTable(
                name: "Columns",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    Name = table.Column<string>(type: "text", nullable: false),
                    Hint = table.Column<string>(type: "text", nullable: true),
                    Position = table.Column<int>(type: "integer", nullable: false),
                    IsDefault = table.Column<bool>(type: "boolean", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Columns", x => x.Id);
                });

            migrationBuilder.InsertData(
                table: "Columns",
                columns: new[] { "Id", "Hint", "IsDefault", "Name", "Position" },
                values: new object[,]
                {
                    { 1, "Ideas & someday", true, "Backlog", 0 },
                    { 2, "This week", true, "ToDo", 1 },
                    { 3, "Focus now", true, "InProgress", 2 },
                    { 4, "Nice work", true, "Done", 3 }
                });

            // Backfill: remap the old BoardColumn enum ints (0..3) onto the new Columns.Id
            // values (1..4) that were just seeded above. Must run after the Columns rows exist
            // and before the FK constraint is added below.
            migrationBuilder.Sql("UPDATE \"Tasks\" SET \"ColumnId\" = \"ColumnId\" + 1;");

            migrationBuilder.AddForeignKey(
                name: "FK_Tasks_Columns_ColumnId",
                table: "Tasks",
                column: "ColumnId",
                principalTable: "Columns",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Tasks_Columns_ColumnId",
                table: "Tasks");

            // Reverse the backfill before the Columns table (and its seeded ids) disappears.
            migrationBuilder.Sql("UPDATE \"Tasks\" SET \"ColumnId\" = \"ColumnId\" - 1;");

            migrationBuilder.DropTable(
                name: "Columns");

            migrationBuilder.RenameColumn(
                name: "ColumnId",
                table: "Tasks",
                newName: "Column");

            migrationBuilder.RenameIndex(
                name: "IX_Tasks_ColumnId_Position",
                table: "Tasks",
                newName: "IX_Tasks_Column_Position");
        }
    }
}
