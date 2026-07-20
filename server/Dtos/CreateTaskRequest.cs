using System.ComponentModel.DataAnnotations;

namespace Kanban.Api.Dtos;

public class CreateTaskRequest
{
    [Required, MinLength(1)]
    public required string Title { get; set; }
}
