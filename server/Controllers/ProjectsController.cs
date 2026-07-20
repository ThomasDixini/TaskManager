using Kanban.Api.Data;
using Kanban.Api.Dtos;
using Kanban.Api.Entities;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Kanban.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ProjectsController : ControllerBase
{
    private readonly AppDbContext _db;

    public ProjectsController(AppDbContext db)
    {
        _db = db;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<ProjectDto>>> GetProjects()
    {
        var projects = await _db.Projects
            .OrderBy(p => p.Name)
            .Select(p => new ProjectDto(p.Id, p.Name))
            .ToListAsync();

        return Ok(projects);
    }

    [HttpPost]
    public async Task<ActionResult<ProjectDto>> CreateProject(CreateProjectRequest request)
    {
        var project = new Project
        {
            Name = request.Name
        };

        _db.Projects.Add(project);
        await _db.SaveChangesAsync();

        var dto = new ProjectDto(project.Id, project.Name);

        return CreatedAtAction(nameof(GetProjects), new { id = project.Id }, dto);
    }
}
