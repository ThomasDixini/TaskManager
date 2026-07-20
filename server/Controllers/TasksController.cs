using Kanban.Api.Data;
using Kanban.Api.Dtos;
using Kanban.Api.Entities;
using Kanban.Api.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Kanban.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class TasksController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly TaskPositionService _positionService;

    public TasksController(AppDbContext db, TaskPositionService positionService)
    {
        _db = db;
        _positionService = positionService;
    }

    // GET /api/tasks?projectId={int}
    [HttpGet]
    public async Task<ActionResult<IEnumerable<TaskDto>>> GetTasks([FromQuery] int? projectId)
    {
        var query = _db.Tasks.AsQueryable();
        if (projectId.HasValue)
        {
            query = query.Where(t => t.ProjectId == projectId.Value);
        }

        var tasks = await query
            .OrderBy(t => t.Column)
            .ThenBy(t => t.Position)
            .ToListAsync();

        return Ok(tasks.Select(MapToDto));
    }

    // POST /api/tasks
    [HttpPost]
    public async Task<ActionResult<TaskDto>> CreateTask(CreateTaskRequest request)
    {
        var maxPosition = await _db.Tasks
            .Where(t => t.Column == BoardColumn.ToDo)
            .Select(t => (int?)t.Position)
            .MaxAsync();
        var position = maxPosition.HasValue ? maxPosition.Value + 1 : 0;

        var task = new TaskItem
        {
            Title = request.Title,
            Description = null,
            ProjectId = null,
            Priority = null,
            Column = BoardColumn.ToDo,
            Position = position
        };

        _db.Tasks.Add(task);
        await _db.SaveChangesAsync();

        return Created($"/api/tasks/{task.Id}", MapToDto(task));
    }

    // PUT /api/tasks/{id}
    [HttpPut("{id}")]
    public async Task<ActionResult<TaskDto>> UpdateTask(int id, UpdateTaskRequest request)
    {
        var task = await _db.Tasks.FindAsync(id);
        if (task == null)
        {
            return NotFound();
        }

        task.Title = request.Title;
        task.Description = request.Description;
        task.ProjectId = request.ProjectId;
        task.Priority = request.Priority;

        await _db.SaveChangesAsync();

        return Ok(MapToDto(task));
    }

    // DELETE /api/tasks/{id}
    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteTask(int id)
    {
        var task = await _db.Tasks.FindAsync(id);
        if (task == null)
        {
            return NotFound();
        }

        await _positionService.RemoveAsync(_db, task);

        return NoContent();
    }

    // PATCH /api/tasks/{id}/move
    [HttpPatch("{id}/move")]
    public async Task<ActionResult<TaskDto>> MoveTask(int id, MoveTaskRequest request)
    {
        var task = await _positionService.MoveAsync(_db, id, request.Column, request.Position);
        if (task == null)
        {
            return NotFound();
        }

        return Ok(MapToDto(task));
    }

    private static TaskDto MapToDto(TaskItem task) => new(
        task.Id,
        task.Title,
        task.Description,
        task.ProjectId,
        task.Priority?.ToString(),
        task.Column.ToString(),
        task.Position);
}
