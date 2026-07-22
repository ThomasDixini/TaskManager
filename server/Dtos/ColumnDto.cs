namespace Kanban.Api.Dtos;

public record ColumnDto(int Id, string Name, string? Hint, int Position, bool IsDefault);
