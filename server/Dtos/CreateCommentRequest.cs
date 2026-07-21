using System.ComponentModel.DataAnnotations;

namespace Kanban.Api.Dtos;

public class CreateCommentRequest
{
    [Required, MinLength(1)]
    public required string Text { get; set; }
}
