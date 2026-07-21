using Kanban.Api.Dtos;
using Kanban.Api.Entities;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Kanban.Api.Controllers;

public partial class TasksController
{
    // POST /api/tasks/{id}/comments
    [HttpPost("{id}/comments")]
    public async Task<ActionResult<CommentDto>> CreateComment(int id, CreateCommentRequest request)
    {
        var taskExists = await _db.Tasks.AnyAsync(t => t.Id == id);
        if (!taskExists)
        {
            return NotFound();
        }

        var comment = new Comment
        {
            TaskItemId = id,
            Text = request.Text,
            CreatedAt = DateTime.UtcNow
        };

        _db.Comments.Add(comment);
        await _db.SaveChangesAsync();

        var dto = new CommentDto(comment.Id, comment.Text, comment.CreatedAt);

        return Created($"/api/tasks/{id}/comments/{comment.Id}", dto);
    }
}
