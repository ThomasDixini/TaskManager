using System.ComponentModel.DataAnnotations;

namespace Kanban.Api.Dtos;

public class ToggleSubtaskRequest
{
    [Required]
    public required bool Done { get; set; }
}
