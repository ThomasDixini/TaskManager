namespace Kanban.Api.Entities;

public class Comment
{
    public int Id { get; set; }
    public required int TaskItemId { get; set; }
    public TaskItem? TaskItem { get; set; }
    public required string Text { get; set; }
    public required DateTime CreatedAt { get; set; }
}
