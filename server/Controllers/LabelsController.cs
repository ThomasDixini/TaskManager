using System.Text.RegularExpressions;
using Kanban.Api.Data;
using Kanban.Api.Dtos;
using Kanban.Api.Entities;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Kanban.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class LabelsController : ControllerBase
{
    private static readonly HashSet<string> ValidTones = new(StringComparer.OrdinalIgnoreCase)
    {
        "coral", "amber", "teal", "violet", "blue", "rose", "slate"
    };

    private readonly AppDbContext _db;

    public LabelsController(AppDbContext db)
    {
        _db = db;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<LabelDto>>> GetLabels()
    {
        var labels = await _db.Labels
            .OrderBy(l => l.Name)
            .Select(l => new LabelDto(l.Id, l.Name, l.Tone))
            .ToListAsync();

        return Ok(labels);
    }

    [HttpPost]
    public async Task<ActionResult<LabelDto>> CreateLabel(CreateLabelRequest request)
    {
        if (!IsValidTone(request.Tone))
        {
            return BadRequest($"Invalid tone. Must be one of: {string.Join(", ", ValidTones)}");
        }

        var id = await GenerateUniqueSlugAsync(request.Name);

        var label = new Label
        {
            Id = id,
            Name = request.Name,
            Tone = request.Tone
        };

        _db.Labels.Add(label);
        await _db.SaveChangesAsync();

        var dto = new LabelDto(label.Id, label.Name, label.Tone);

        return CreatedAtAction(nameof(GetLabels), new { id = label.Id }, dto);
    }

    [HttpPut("{id}")]
    public async Task<ActionResult<LabelDto>> UpdateLabel(string id, UpdateLabelRequest request)
    {
        var label = await _db.Labels.FirstOrDefaultAsync(l => l.Id == id);
        if (label == null)
        {
            return NotFound();
        }

        if (!IsValidTone(request.Tone))
        {
            return BadRequest($"Invalid tone. Must be one of: {string.Join(", ", ValidTones)}");
        }

        label.Name = request.Name;
        label.Tone = request.Tone;

        await _db.SaveChangesAsync();

        return Ok(new LabelDto(label.Id, label.Name, label.Tone));
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteLabel(string id)
    {
        var label = await _db.Labels.FirstOrDefaultAsync(l => l.Id == id);
        if (label == null)
        {
            return NotFound();
        }

        _db.Labels.Remove(label);
        await _db.SaveChangesAsync();

        return NoContent();
    }

    private static bool IsValidTone(string tone) => ValidTones.Contains(tone);

    private async Task<string> GenerateUniqueSlugAsync(string name)
    {
        var baseSlug = Slugify(name);
        if (string.IsNullOrEmpty(baseSlug))
        {
            baseSlug = "label";
        }

        var existingIds = await _db.Labels
            .Select(l => l.Id)
            .ToListAsync();
        var existingSet = new HashSet<string>(existingIds, StringComparer.OrdinalIgnoreCase);

        if (!existingSet.Contains(baseSlug))
        {
            return baseSlug;
        }

        var suffix = 2;
        string candidate;
        do
        {
            candidate = $"{baseSlug}-{suffix}";
            suffix++;
        } while (existingSet.Contains(candidate));

        return candidate;
    }

    private static string Slugify(string value)
    {
        var lowered = value.Trim().ToLowerInvariant();
        var collapsed = Regex.Replace(lowered, "[^a-z0-9]+", "-");
        return collapsed.Trim('-');
    }
}
