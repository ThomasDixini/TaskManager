using System.ComponentModel.DataAnnotations;

namespace Kanban.Api.Dtos;

public class UpdateLabelRequest
{
    [Required, MinLength(1)]
    public required string Name { get; set; }
    [Required]
    public required string Tone { get; set; }
}
