using System.ComponentModel.DataAnnotations;
using Kanban.Api.Entities;

namespace Kanban.Api.Dtos;

public class CreateTaskRequest
{
    [Required, MinLength(1)]
    public required string Title { get; set; }
    public BoardColumn? Column { get; set; }
}
