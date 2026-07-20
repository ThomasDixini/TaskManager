namespace Kanban.Api.Entities;

public class Project
{
    public int Id { get; set; }
    public required string Name { get; set; }
    public ICollection<TaskItem> Tasks { get; set; } = new List<TaskItem>();
}
