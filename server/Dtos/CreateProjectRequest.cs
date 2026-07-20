using System.ComponentModel.DataAnnotations;

namespace Kanban.Api.Dtos;

public class CreateProjectRequest
{
    [Required, MinLength(1)]
    public required string Name { get; set; }
}
