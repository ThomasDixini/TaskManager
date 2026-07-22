using Kanban.Api.Data;
using Kanban.Api.Dtos;
using Kanban.Api.Entities;
using Kanban.Api.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Kanban.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public partial class TasksController : ControllerBase
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

        var rows = await query
            .Include(t => t.Labels)
            .Include(t => t.Column)
            .OrderBy(t => t.Column!.Position)
            .ThenBy(t => t.Position)
            .Select(t => new
            {
                Task = t,
                SubtaskTotal = _db.Subtasks.Count(s => s.TaskItemId == t.Id),
                SubtaskDone = _db.Subtasks.Count(s => s.TaskItemId == t.Id && s.Done),
                CommentCount = _db.Comments.Count(c => c.TaskItemId == t.Id)
            })
            .ToListAsync();

        return Ok(rows.Select(r => MapToDto(r.Task, r.SubtaskTotal, r.SubtaskDone, r.CommentCount)));
    }

    // GET /api/tasks/{id}
    [HttpGet("{id}")]
    public async Task<ActionResult<TaskDetailDto>> GetTask(int id)
    {
        var task = await _db.Tasks
            .Include(t => t.Labels)
            .Include(t => t.Column)
            .FirstOrDefaultAsync(t => t.Id == id);

        if (task == null)
        {
            return NotFound();
        }

        var subtasks = await _db.Subtasks
            .Where(s => s.TaskItemId == id)
            .OrderBy(s => s.Position)
            .ToListAsync();

        var comments = await _db.Comments
            .Where(c => c.TaskItemId == id)
            .OrderBy(c => c.CreatedAt)
            .ToListAsync();

        return Ok(MapToDetailDto(task, subtasks, comments));
    }

    // POST /api/tasks
    [HttpPost]
    public async Task<ActionResult<TaskDto>> CreateTask(CreateTaskRequest request)
    {
        var columnName = request.Column ?? "ToDo";
        var column = await _db.Columns.FirstOrDefaultAsync(c => c.Name == columnName);
        if (column == null)
        {
            return BadRequest($"Unknown column: {columnName}");
        }

        var maxPosition = await _db.Tasks
            .Where(t => t.ColumnId == column.Id)
            .Select(t => (int?)t.Position)
            .MaxAsync();
        var position = maxPosition.HasValue ? maxPosition.Value + 1 : 0;

        var task = new TaskItem
        {
            Title = request.Title,
            Description = null,
            ProjectId = null,
            Priority = null,
            ColumnId = column.Id,
            Position = position
        };

        _db.Tasks.Add(task);
        await _db.SaveChangesAsync();

        task.Column = column;

        return Created($"/api/tasks/{task.Id}", MapToDto(task, 0, 0, 0));
    }

    // PUT /api/tasks/{id}
    [HttpPut("{id}")]
    public async Task<ActionResult<TaskDto>> UpdateTask(int id, UpdateTaskRequest request)
    {
        var task = await _db.Tasks
            .Include(t => t.Labels)
            .Include(t => t.Column)
            .FirstOrDefaultAsync(t => t.Id == id);
        if (task == null)
        {
            return NotFound();
        }

        task.Title = request.Title;
        task.Description = request.Description;
        task.ProjectId = request.ProjectId;
        task.Priority = request.Priority;
        task.DueDate = request.DueDate == null ? null : DateOnly.Parse(request.DueDate);

        var labels = await _db.Labels
            .Where(l => request.LabelIds.Contains(l.Id))
            .ToListAsync();
        task.Labels = labels;

        await _db.SaveChangesAsync();

        var subtaskTotal = await _db.Subtasks.CountAsync(s => s.TaskItemId == id);
        var subtaskDone = await _db.Subtasks.CountAsync(s => s.TaskItemId == id && s.Done);
        var commentCount = await _db.Comments.CountAsync(c => c.TaskItemId == id);

        return Ok(MapToDto(task, subtaskTotal, subtaskDone, commentCount));
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
        var column = await _db.Columns.FirstOrDefaultAsync(c => c.Name == request.Column);
        if (column == null)
        {
            return BadRequest($"Unknown column: {request.Column}");
        }

        var task = await _positionService.MoveAsync(_db, id, column.Id, request.Position);
        if (task == null)
        {
            return NotFound();
        }

        // Reload labels and column for the response DTO (MoveAsync loads the task without Include).
        await _db.Entry(task).Collection(t => t.Labels).LoadAsync();
        await _db.Entry(task).Reference(t => t.Column).LoadAsync();

        var subtaskTotal = await _db.Subtasks.CountAsync(s => s.TaskItemId == id);
        var subtaskDone = await _db.Subtasks.CountAsync(s => s.TaskItemId == id && s.Done);
        var commentCount = await _db.Comments.CountAsync(c => c.TaskItemId == id);

        return Ok(MapToDto(task, subtaskTotal, subtaskDone, commentCount));
    }

    private static TaskDto MapToDto(TaskItem task, int subtaskTotal, int subtaskDone, int commentCount) => new(
        task.Id,
        task.Title,
        task.Description,
        task.ProjectId,
        task.Priority?.ToString(),
        task.Column!.Name,
        task.Position,
        task.DueDate?.ToString("yyyy-MM-dd"),
        task.Labels.Select(l => l.Id).ToArray(),
        subtaskTotal,
        subtaskDone,
        commentCount);

    private static TaskDetailDto MapToDetailDto(TaskItem task, List<Subtask> subtasks, List<Comment> comments) => new(
        task.Id,
        task.Title,
        task.Description,
        task.ProjectId,
        task.Priority?.ToString(),
        task.Column!.Name,
        task.Position,
        task.DueDate?.ToString("yyyy-MM-dd"),
        task.Labels.Select(l => l.Id).ToArray(),
        subtasks.Select(s => new SubtaskDto(s.Id, s.Text, s.Done, s.Position)).ToArray(),
        comments.Select(c => new CommentDto(c.Id, c.Text, c.CreatedAt)).ToArray());
}
