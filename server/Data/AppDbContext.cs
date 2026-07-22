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
    public DbSet<Column> Columns => Set<Column>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<TaskItem>()
            .HasOne(t => t.Project)
            .WithMany(p => p.Tasks)
            .HasForeignKey(t => t.ProjectId)
            .OnDelete(DeleteBehavior.SetNull);

        modelBuilder.Entity<TaskItem>()
            .HasIndex(t => new { t.ColumnId, t.Position });

        modelBuilder.Entity<TaskItem>()
            .HasOne(t => t.Column)
            .WithMany()
            .HasForeignKey(t => t.ColumnId)
            .OnDelete(DeleteBehavior.Restrict);

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

        modelBuilder.Entity<Column>().HasData(
            new Column { Id = 1, Name = "Backlog", Hint = "Ideas & someday", Position = 0, IsDefault = true },
            new Column { Id = 2, Name = "ToDo", Hint = "This week", Position = 1, IsDefault = true },
            new Column { Id = 3, Name = "InProgress", Hint = "Focus now", Position = 2, IsDefault = true },
            new Column { Id = 4, Name = "Done", Hint = "Nice work", Position = 3, IsDefault = true }
        );
    }
}
