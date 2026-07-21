using Kanban.Api.Entities;
using Microsoft.EntityFrameworkCore;

namespace Kanban.Api.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options)
    {
    }

    public DbSet<Project> Projects => Set<Project>();
    public DbSet<TaskItem> Tasks => Set<TaskItem>();
    public DbSet<Label> Labels => Set<Label>();
    public DbSet<Subtask> Subtasks => Set<Subtask>();
    public DbSet<Comment> Comments => Set<Comment>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<TaskItem>()
            .HasOne(t => t.Project)
            .WithMany(p => p.Tasks)
            .HasForeignKey(t => t.ProjectId)
            .OnDelete(DeleteBehavior.SetNull);

        modelBuilder.Entity<TaskItem>()
            .HasIndex(t => new { t.Column, t.Position });

        modelBuilder.Entity<TaskItem>()
            .HasMany(t => t.Labels)
            .WithMany(l => l.Tasks);

        modelBuilder.Entity<Subtask>()
            .HasOne(s => s.TaskItem)
            .WithMany()
            .HasForeignKey(s => s.TaskItemId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<Comment>()
            .HasOne(c => c.TaskItem)
            .WithMany()
            .HasForeignKey(c => c.TaskItemId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<Label>().HasData(
            new Label { Id = "design", Name = "Design", Tone = "coral" },
            new Label { Id = "research", Name = "Research", Tone = "violet" },
            new Label { Id = "writing", Name = "Writing", Tone = "amber" },
            new Label { Id = "bug", Name = "Bug", Tone = "rose" },
            new Label { Id = "chore", Name = "Chore", Tone = "slate" },
            new Label { Id = "health", Name = "Health", Tone = "teal" },
            new Label { Id = "learning", Name = "Learning", Tone = "blue" }
        );
    }
}
