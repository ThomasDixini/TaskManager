namespace Kanban.Api.Entities;

public class TaskItem
{
    public int Id { get; set; }
    public required string Title { get; set; }
    public string? Description { get; set; }
    public int? ProjectId { get; set; }
    public Project? Project { get; set; }
    public Priority? Priority { get; set; }
    public required int ColumnId { get; set; }
    public Column? Column { get; set; }
    public required int Position { get; set; }
    public DateOnly? DueDate { get; set; }
    public ICollection<Label> Labels { get; set; } = new List<Label>();
}
