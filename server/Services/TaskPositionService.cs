using Kanban.Api.Data;
using Kanban.Api.Entities;
using Microsoft.EntityFrameworkCore;

namespace Kanban.Api.Services;

/// <summary>
/// Encapsulates the reindexing logic needed to move a task between/within board columns
/// while keeping each column's Position values a contiguous 0-based sequence.
/// </summary>
public class TaskPositionService
{
    /// <summary>
    /// Moves the task identified by <paramref name="taskId"/> to <paramref name="targetColumn"/> /
    /// <paramref name="targetPosition"/>, shifting the positions of the other tasks in the affected
    /// column(s) as needed. Returns the updated task, or <c>null</c> if no task with that id exists.
    /// </summary>
    public async Task<TaskItem?> MoveAsync(AppDbContext db, int taskId, BoardColumn targetColumn, int targetPosition)
    {
        var task = await db.Tasks.FindAsync(taskId);
        if (task == null)
        {
            return null;
        }

        var oldColumn = task.Column;
        var oldPosition = task.Position;

        // Clamp the requested position to the valid range for the destination column
        // (0..count of tasks that will remain in that column besides the one being moved).
        var destinationCount = await db.Tasks
            .CountAsync(t => t.Column == targetColumn && t.Id != taskId);
        targetPosition = Math.Clamp(targetPosition, 0, destinationCount);

        if (oldColumn == targetColumn)
        {
            if (targetPosition == oldPosition)
            {
                // No-op: nothing to reindex.
                return task;
            }

            if (targetPosition < oldPosition)
            {
                // Moving earlier in the column: shift the tasks between the new and old
                // position down by one to make room.
                var toShift = await db.Tasks
                    .Where(t => t.Column == oldColumn
                        && t.Id != taskId
                        && t.Position >= targetPosition
                        && t.Position < oldPosition)
                    .ToListAsync();
                foreach (var t in toShift)
                {
                    t.Position += 1;
                }
            }
            else
            {
                // Moving later in the column: shift the tasks between the old and new
                // position up by one to close the gap left behind.
                var toShift = await db.Tasks
                    .Where(t => t.Column == oldColumn
                        && t.Id != taskId
                        && t.Position > oldPosition
                        && t.Position <= targetPosition)
                    .ToListAsync();
                foreach (var t in toShift)
                {
                    t.Position -= 1;
                }
            }

            task.Position = targetPosition;
        }
        else
        {
            // Close the gap left in the source column.
            var afterOldPosition = await db.Tasks
                .Where(t => t.Column == oldColumn && t.Id != taskId && t.Position > oldPosition)
                .ToListAsync();
            foreach (var t in afterOldPosition)
            {
                t.Position -= 1;
            }

            // Make room at the target position in the destination column.
            var atOrAfterTargetPosition = await db.Tasks
                .Where(t => t.Column == targetColumn && t.Id != taskId && t.Position >= targetPosition)
                .ToListAsync();
            foreach (var t in atOrAfterTargetPosition)
            {
                t.Position += 1;
            }

            task.Column = targetColumn;
            task.Position = targetPosition;
        }

        await db.SaveChangesAsync();
        return task;
    }

    /// <summary>
    /// Removes <paramref name="task"/> and closes the resulting gap in its column so that
    /// positions stay a contiguous 0-based sequence. Persists the removal in the same
    /// SaveChanges call as the reindex.
    /// </summary>
    public async Task RemoveAsync(AppDbContext db, TaskItem task)
    {
        var afterRemoved = await db.Tasks
            .Where(t => t.Column == task.Column && t.Id != task.Id && t.Position > task.Position)
            .ToListAsync();
        foreach (var t in afterRemoved)
        {
            t.Position -= 1;
        }

        db.Tasks.Remove(task);
        await db.SaveChangesAsync();
    }
}
