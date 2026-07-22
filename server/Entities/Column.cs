namespace Kanban.Api.Entities;

public class Column
{
    public int Id { get; set; }
    public required string Name { get; set; }
    public string? Hint { get; set; }
    public required int Position { get; set; }
    public required bool IsDefault { get; set; }
}
