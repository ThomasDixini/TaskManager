using System.ComponentModel.DataAnnotations;

namespace Kanban.Api.Dtos;

public class UpdateColumnRequest
{
    [Required, MinLength(1)]
    public required string Name { get; set; }
}
