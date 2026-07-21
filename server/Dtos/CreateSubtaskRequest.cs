using System.ComponentModel.DataAnnotations;

namespace Kanban.Api.Dtos;

public class CreateSubtaskRequest
{
    [Required, MinLength(1)]
    public required string Text { get; set; }
}
