namespace Kanban.Api.Dtos;

public record TaskDto(
    int Id, string Title, string? Description, int? ProjectId, string? Priority,
    string Column, int Position, string? DueDate, string[] LabelIds,
    int SubtaskTotal, int SubtaskDone, int CommentCount);
