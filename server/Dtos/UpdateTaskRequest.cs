using System.ComponentModel.DataAnnotations;
using Kanban.Api.Entities;

namespace Kanban.Api.Dtos;

public class UpdateTaskRequest
{
    [Required, MinLength(1)]
    public required string Title { get; set; }
    public string? Description { get; set; }
    public int? ProjectId { get; set; }
    public Priority? Priority { get; set; }
}
