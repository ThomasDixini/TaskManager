using System.ComponentModel.DataAnnotations;
using Kanban.Api.Entities;

namespace Kanban.Api.Dtos;

public class MoveTaskRequest
{
    [Required]
    public required BoardColumn Column { get; set; }
    [Required]
    public required int Position { get; set; }
}
