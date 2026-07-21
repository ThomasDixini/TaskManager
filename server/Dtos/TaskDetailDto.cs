namespace Kanban.Api.Dtos;

public record TaskDetailDto(
    int Id, string Title, string? Description, int? ProjectId, string? Priority,
    string Column, int Position, string? DueDate, string[] LabelIds,
    SubtaskDto[] Subtasks, CommentDto[] Comments);

// Temporary local records in TaskDetailDto.cs — 301/302 will move these into their own
// SubtaskDto.cs / CommentDto.cs files; keep the shapes identical so no breaking change occurs.
public record SubtaskDto(int Id, string Text, bool Done, int Position);
public record CommentDto(int Id, string Text, DateTime CreatedAt);
