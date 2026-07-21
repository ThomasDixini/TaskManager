namespace Kanban.Api.Entities;

public class Label
{
    public required string Id { get; set; }
    public required string Name { get; set; }
    public required string Tone { get; set; }
    public ICollection<TaskItem> Tasks { get; set; } = new List<TaskItem>();
}
