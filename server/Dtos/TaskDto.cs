namespace Kanban.Api.Dtos;

public record TaskDto(int Id, string Title, string? Description, int? ProjectId, string? Priority, string Column, int Position);
