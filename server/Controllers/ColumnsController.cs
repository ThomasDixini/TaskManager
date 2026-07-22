using Kanban.Api.Data;
using Kanban.Api.Dtos;
using Kanban.Api.Entities;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Kanban.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ColumnsController : ControllerBase
{
    private readonly AppDbContext _db;

    public ColumnsController(AppDbContext db)
    {
        _db = db;
    }

    // GET /api/columns
    [HttpGet]
    public async Task<ActionResult<IEnumerable<ColumnDto>>> GetColumns()
    {
        var columns = await _db.Columns
            .OrderBy(c => c.Position)
            .Select(c => new ColumnDto(c.Id, c.Name, c.Hint, c.Position, c.IsDefault))
            .ToListAsync();

        return Ok(columns);
    }

    // POST /api/columns
    [HttpPost]
    public async Task<ActionResult<ColumnDto>> CreateColumn(CreateColumnRequest request)
    {
        var nameCollision = await _db.Columns
            .AnyAsync(c => c.Name.ToLower() == request.Name.ToLower());
        if (nameCollision)
        {
            return BadRequest($"A column named '{request.Name}' already exists.");
        }

        var maxPosition = await _db.Columns
            .Select(c => (int?)c.Position)
            .MaxAsync();
        var position = maxPosition.HasValue ? maxPosition.Value + 1 : 0;

        var column = new Column
        {
            Name = request.Name,
            Hint = null,
            Position = position,
            IsDefault = false
        };

        _db.Columns.Add(column);
        await _db.SaveChangesAsync();

        var dto = new ColumnDto(column.Id, column.Name, column.Hint, column.Position, column.IsDefault);

        return Created($"/api/columns/{column.Id}", dto);
    }

    // PUT /api/columns/{id}
    [HttpPut("{id}")]
    public async Task<ActionResult<ColumnDto>> UpdateColumn(int id, UpdateColumnRequest request)
    {
        var column = await _db.Columns.FirstOrDefaultAsync(c => c.Id == id);
        if (column == null)
        {
            return NotFound();
        }

        if (column.IsDefault)
        {
            return BadRequest("Default columns cannot be renamed.");
        }

        var nameCollision = await _db.Columns
            .AnyAsync(c => c.Id != id && c.Name.ToLower() == request.Name.ToLower());
        if (nameCollision)
        {
            return BadRequest($"A column named '{request.Name}' already exists.");
        }

        column.Name = request.Name;

        await _db.SaveChangesAsync();

        return Ok(new ColumnDto(column.Id, column.Name, column.Hint, column.Position, column.IsDefault));
    }

    // DELETE /api/columns/{id}
    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteColumn(int id)
    {
        var column = await _db.Columns.FirstOrDefaultAsync(c => c.Id == id);
        if (column == null)
        {
            return NotFound();
        }

        if (column.IsDefault)
        {
            return BadRequest("Default columns cannot be deleted.");
        }

        var backlog = await _db.Columns.FirstOrDefaultAsync(c => c.IsDefault && c.Name == "Backlog");
        if (backlog == null)
        {
            return Problem("Backlog column not found; cannot re-home tasks.", statusCode: 500);
        }

        var backlogMaxPosition = await _db.Tasks
            .Where(t => t.ColumnId == backlog.Id)
            .Select(t => (int?)t.Position)
            .MaxAsync();
        var nextPosition = backlogMaxPosition.HasValue ? backlogMaxPosition.Value + 1 : 0;

        var tasksToMove = await _db.Tasks
            .Where(t => t.ColumnId == column.Id)
            .OrderBy(t => t.Position)
            .ToListAsync();

        foreach (var task in tasksToMove)
        {
            task.ColumnId = backlog.Id;
            task.Position = nextPosition;
            nextPosition++;
        }

        _db.Columns.Remove(column);

        var columnsAfter = await _db.Columns
            .Where(c => c.Id != column.Id && c.Position > column.Position)
            .ToListAsync();
        foreach (var c in columnsAfter)
        {
            c.Position -= 1;
        }

        await _db.SaveChangesAsync();

        return NoContent();
    }

    // PATCH /api/columns/reorder
    [HttpPatch("reorder")]
    public async Task<ActionResult<IEnumerable<ColumnDto>>> ReorderColumns(ReorderColumnsRequest request)
    {
        var columns = await _db.Columns.ToListAsync();

        var existingIds = new HashSet<int>(columns.Select(c => c.Id));
        var providedIds = request.OrderedIds;

        var hasDuplicates = providedIds.Length != providedIds.Distinct().Count();
        var sameCount = providedIds.Length == existingIds.Count;
        var allKnown = providedIds.All(existingIds.Contains);

        if (hasDuplicates || !sameCount || !allKnown)
        {
            return BadRequest("orderedIds must contain exactly the current set of column ids, with no duplicates.");
        }

        var columnsById = columns.ToDictionary(c => c.Id);
        for (var index = 0; index < providedIds.Length; index++)
        {
            columnsById[providedIds[index]].Position = index;
        }

        await _db.SaveChangesAsync();

        var result = await _db.Columns
            .OrderBy(c => c.Position)
            .Select(c => new ColumnDto(c.Id, c.Name, c.Hint, c.Position, c.IsDefault))
            .ToListAsync();

        return Ok(result);
    }
}
