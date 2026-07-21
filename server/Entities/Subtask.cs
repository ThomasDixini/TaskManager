namespace Kanban.Api.Entities;

public class Subtask
{
    public int Id { get; set; }
    public required int TaskItemId { get; set; }
    public TaskItem? TaskItem { get; set; }
    public required string Text { get; set; }
    public required bool Done { get; set; }
    public required int Position { get; set; }
}
