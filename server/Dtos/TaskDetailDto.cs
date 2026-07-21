namespace Kanban.Api.Dtos;

public record TaskDetailDto(
    int Id, string Title, string? Description, int? ProjectId, string? Priority,
    string Column, int Position, string? DueDate, string[] LabelIds,
    SubtaskDto[] Subtasks, CommentDto[] Comments);
