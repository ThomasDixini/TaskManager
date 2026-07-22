using System.ComponentModel.DataAnnotations;

namespace Kanban.Api.Dtos;

public class ReorderColumnsRequest
{
    [Required]
    public required int[] OrderedIds { get; set; }
}
