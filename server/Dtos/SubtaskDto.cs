namespace Kanban.Api.Dtos;

public record SubtaskDto(int Id, string Text, bool Done, int Position);
