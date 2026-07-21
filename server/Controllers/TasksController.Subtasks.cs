using Kanban.Api.Dtos;
using Kanban.Api.Entities;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Kanban.Api.Controllers;

public partial class TasksController
{
    // POST /api/tasks/{id}/subtasks
    [HttpPost("{id}/subtasks")]
    public async Task<ActionResult<SubtaskDto>> CreateSubtask(int id, CreateSubtaskRequest request)
    {
        var taskExists = await _db.Tasks.AnyAsync(t => t.Id == id);
        if (!taskExists)
        {
            return NotFound();
        }

        var maxPosition = await _db.Subtasks
            .Where(s => s.TaskItemId == id)
            .Select(s => (int?)s.Position)
            .MaxAsync();
        var position = maxPosition.HasValue ? maxPosition.Value + 1 : 0;

        var subtask = new Subtask
        {
            TaskItemId = id,
            Text = request.Text,
            Done = false,
            Position = position
        };

        _db.Subtasks.Add(subtask);
        await _db.SaveChangesAsync();

        return Created(
            $"/api/tasks/{id}/subtasks/{subtask.Id}",
            new SubtaskDto(subtask.Id, subtask.Text, subtask.Done, subtask.Position));
    }

    // PATCH /api/tasks/{id}/subtasks/{subtaskId}
    [HttpPatch("{id}/subtasks/{subtaskId}")]
    public async Task<ActionResult<SubtaskDto>> ToggleSubtask(int id, int subtaskId, ToggleSubtaskRequest request)
    {
        var taskExists = await _db.Tasks.AnyAsync(t => t.Id == id);
        if (!taskExists)
        {
            return NotFound();
        }

        var subtask = await _db.Subtasks.FirstOrDefaultAsync(s => s.Id == subtaskId && s.TaskItemId == id);
        if (subtask == null)
        {
            return NotFound();
        }

        subtask.Done = request.Done;
        await _db.SaveChangesAsync();

        return Ok(new SubtaskDto(subtask.Id, subtask.Text, subtask.Done, subtask.Position));
    }
}
