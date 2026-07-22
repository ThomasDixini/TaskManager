using System.ComponentModel.DataAnnotations;

namespace Kanban.Api.Dtos;

public class CreateLabelRequest
{
    [Required, MinLength(1)]
    public required string Name { get; set; }
    [Required]
    public required string Tone { get; set; }
}
