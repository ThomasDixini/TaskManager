using System.ComponentModel.DataAnnotations;

namespace Kanban.Api.Dtos;

public class MoveTaskRequest
{
    [Required]
    public required string Column { get; set; }
    [Required]
    public required int Position { get; set; }
}
