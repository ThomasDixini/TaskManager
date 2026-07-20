namespace Kanban.Api.Entities;

public class TaskItem
{
    public int Id { get; set; }
    public required string Title { get; set; }
    public string? Description { get; set; }
    public int? ProjectId { get; set; }
    public Project? Project { get; set; }
    public Priority? Priority { get; set; }
    public required BoardColumn Column { get; set; }
    public required int Position { get; set; }
}
