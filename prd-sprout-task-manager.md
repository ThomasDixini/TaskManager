# PRD: Sprout Task Manager (Design Redesign & Feature Expansion)

## 1. Overview

Sprout is a visual and functional redesign of the existing Kanban Board MVP, based on a high-fidelity interactive prototype ("Sprout Task Manager") built and reviewed on claude.ai/design (project `c2cf9ea2-a34a-4683-b117-0c482d3807ce`, file `Sprout Task Manager.html`). It replaces the MVP's plain three-column board with a warmer, more considered product: a cream-and-coral visual identity, a Dashboard/Overview page, a fourth "Backlog" column, multi-label tagging, subtasks with progress tracking, a per-task comments/activity feed, assignees, a slide-in task detail drawer (replacing the current modal), and cosmetic customization (light/dark theme, layout density, accent color, corner radius).

This PRD documents the prototype's full scope as a reference for scoping implementation. It is a description of what the design contains, not a commitment to build all of it in one pass — several elements (most notably assignees, which imply multiple people) conflict with decisions already made for the current MVP (single user, no authentication). See section 12 for what needs to be resolved, and section 11 for a suggested incremental path that lets the visual redesign ship independently of the larger feature additions.

## 2. Goals

- Replace the current board's plain Material look with Sprout's warm, branded visual identity (typography, color palette, spacing, card and shadow treatment).
- Give the user an at-a-glance Dashboard/Overview: what's due today, what's in progress, overall weekly completion, and per-project progress.
- Add a "Backlog" column so ideas/someday items are separated from committed To Do work.
- Let the user break a task into subtasks and track completion progress on both the card and the detail view.
- Let the user tag a task with multiple labels (e.g. Design, Bug, Research), not just one priority level.
- Let the user leave comments/notes on a task, visible as an activity feed.
- Replace the task editor modal with a slide-in detail drawer that supports richer content (status/priority as segmented controls, subtasks, comments) without feeling cramped.
- Offer basic personalization: light/dark theme, layout density, accent color, and corner roundness.

## 3. Non-Goals

- Real multi-user collaboration, accounts, or permissions. The prototype shows named assignees (You, Sam Rivera, Jo Park), but the current app is explicitly local, single-user, and has no authentication. Unless a future PRD explicitly reintroduces multi-user support, "assignee" should be treated as a single implicit user, not a real people-management feature.
- Real-time updates or notifications (the prototype's bell icon is decorative in the source).
- Global full-text search beyond simple client-side title filtering (the prototype's search box only filters by title match).
- Calendar/month view (referenced only as a backlog task's own subject matter inside the prototype's seed data, not as a built view).
- Any change to the underlying local-only, Docker-Postgres, no-auth architecture established for the MVP.

## 4. Target Users & Use Cases

Same target user as the original MVP: a single developer managing their own day-to-day tasks across concurrent software projects, on their own machine. Sprout's additions serve two new use cases on top of the original ones:

- Starting the day by opening the Dashboard to see what's due and what's in flight, instead of scanning the whole board.
- Capturing a task once and refining it over time — adding subtasks as it's broken down, leaving notes as work progresses, without needing every detail up front.

## 5. User Stories

- As the user, I want to open a Dashboard so I can see what's due today and how much is in progress without scanning every column.
- As the user, I want a Backlog column so ideas I'm not committing to yet don't clutter my To Do list.
- As the user, I want to add subtasks to a task and check them off so I can track partial progress on larger work.
- As the user, I want to tag a task with multiple labels (e.g. "Bug" and "Chore") so I can categorize it beyond just its project and priority.
- As the user, I want to leave a comment on a task so I have a running log of decisions or context without editing the main description.
- As the user, I want to open a task in a side drawer instead of a popup modal so I have more room to see its details while the board stays visible behind it.
- As the user, I want to switch between light and dark themes so the app is comfortable to use at different times of day.
- As the user, I want to adjust layout density so I can see more or fewer tasks at once depending on how I'm working.

## 6. Functional Requirements

**Navigation & shell**
1. FR-1: The app must display a persistent left sidebar containing: a brand mark, a primary nav (Overview, Board), a "Projects" section listing all projects (with an "All projects" entry) as clickable filters, and a user/workspace footer.
2. FR-2: Selecting a project in the sidebar must filter the Board view to that project and switch to the Board view; selecting "All projects" must clear the filter.
3. FR-3: On narrow viewports (≤920px per the prototype), the sidebar must collapse into an off-canvas drawer opened via a burger button in the topbar, with a scrim behind it that closes it on click.
4. FR-4: The topbar must include a search input that filters the Board view by task title as the user types, and switches the active view to Board when a search is entered.

**Dashboard / Overview**
5. FR-5: The Dashboard must show a personalized greeting (time-of-day-aware: morning/afternoon/evening) and the current date.
6. FR-6: The Dashboard must show four stat cards: open tasks (all not-Done), due today, in progress (Doing column), and completed.
7. FR-7: The Dashboard must show a "Today's focus" list of all non-Done tasks whose due date is today or overdue, each showing priority, up to one label, and subtask progress if present; clicking a row opens that task's detail drawer; a one-click affordance must mark the task Done directly from this list.
8. FR-8: The Dashboard must show an empty state ("Nothing due today") when no tasks are due today.
9. FR-9: The Dashboard must show a weekly progress ring: percentage of all tasks that are Done, with the raw done/total count.
10. FR-10: The Dashboard must show a per-project list with each project's emoji, name, a mini progress bar, and a done/total count, for every project that has at least one task.

**Board**
11. FR-11: The Board must show four fixed columns, in order: Backlog, To Do, In Progress, Done — each with a name and a short hint line (e.g. "Ideas & someday", "This week", "Focus now", "Nice work").
12. FR-12: Each column header must show a live count of the tasks currently in it.
13. FR-13: Each column must support quick-add: an inline textarea (not just a single-line input) that creates a task with the typed title in that specific column (not always To Do, since Sprout has four columns any of which is a reasonable capture point), submitted on Enter (Shift+Enter for a newline) or an explicit "Add task" button, with Escape/blur-when-empty cancelling.
14. FR-14: Tasks must be draggable within and between all four columns; dropping updates the task's column and its position among siblings.
15. FR-15: A column with no tasks must show an inline "Add a task" affordance instead of an empty list.

**Task card**
16. FR-16: Each card must show: the owning project's emoji + name, a high-priority flag indicator (shown only when priority is High), the task title, any labels as small chips, a subtask progress bar with fraction (e.g. "2/4") when subtasks exist, a due-date badge, a comment-count indicator when comments exist, and the assignee's avatar (togglable via the "Show avatars" setting).
17. FR-17: The due-date badge must read "Today", "Tomorrow", "Nd" for the next 6 days, a formatted date beyond that, and "Nd overdue" / "Yesterday" for past-due dates, with distinct visual treatment for overdue/today vs. future.
18. FR-18: Clicking a card must open that task in the detail drawer.

**Task detail (drawer)**
19. FR-19: Clicking a task must open a right-side slide-in drawer (not a modal dialog) showing the task's full detail, with the board still visible/dimmed behind it; it must close on an explicit close button, clicking the scrim, or pressing Escape.
20. FR-20: The drawer must show the task's project, title, and a delete action (icon button) in its header.
21. FR-21: The drawer must let the user change the task's column via a segmented control (one segment per column) and its priority via a segmented control (High/Medium/Low), applying immediately on click (no separate Save step for these two fields).
22. FR-22: The drawer must show the due date (as a badge) and the assignee (avatar + name).
23. FR-23: The drawer must show all of the task's labels, if any.
24. FR-24: The drawer must show the task's notes/description as read content (the prototype does not show inline editing of the description in the drawer body — it's rendered as static text under a "Notes" heading).
25. FR-25: The drawer must list subtasks with checkboxes (toggle done/undone on click), a progress bar and fraction count above the list, and an inline input to add a new subtask (Enter to submit).
26. FR-26: The drawer must show a comments/activity feed (avatar, author name, relative timestamp, text) with an inline compose input (avatar + text input, Enter to submit); an empty state ("No activity yet…") must show when there are no comments.

**Personalization**
27. FR-27: The app must support a light ("cream") and dark ("dusk") theme, switchable by the user, applied globally.
28. FR-28: The app must support at least three layout densities (compact, regular, comfy) that adjust card padding/gaps and base font size.
29. FR-29: The app must support choosing an accent color from a fixed palette, applied to primary buttons, focus states, and priority/label tinting.
30. FR-30: The app must support adjusting corner roundness as a single global value affecting cards, buttons, and containers.
31. FR-31: Theme, density, accent, and roundness choices must persist across sessions (mechanism to be decided — see Open Questions).

## 7. Non-Functional Requirements

- **Accessibility**: Interactive elements (checkboxes, segmented controls, icon buttons) must have accessible labels (the prototype uses `aria-label`/`title` on icon-only buttons — this must be preserved in implementation). Color choices (both themes, all five accent options) must maintain readable contrast for text on their respective backgrounds.
- **Responsive layout**: The shell must adapt at the prototype's two documented breakpoints — ≤920px (sidebar becomes an off-canvas drawer, dashboard stats go to a 2-column grid, dashboard side grid stacks to one column) and ≤520px (stat grid becomes 2 columns with tighter gap, primary button labels collapse to icon-only in the topbar).
- **Performance**: No specific budget beyond the existing MVP's local, single-user scale; drag-and-drop and theme/density switching should feel immediate (CSS-variable-driven, no full re-render of unrelated views).
- **Consistency with existing stack**: All of the above must be implemented within the existing Angular + Angular Material/CDK frontend and ASP.NET Core + PostgreSQL backend — this PRD does not propose a framework or infrastructure change.

## 8. UX / Design Notes

The source of truth for exact visual details (colors, spacing, type scale, component states) is the Sprout prototype itself — `Sprout Task Manager.html` plus `tm-app.jsx`, `tm-board.jsx`, `tm-dashboard.jsx`, `tm-detail.jsx`, `tm-components.jsx`, and `tm-data.jsx` in the claude.ai/design project referenced above. Key flows worth calling out:

- **Empty states**: no tasks due today (Dashboard), no comments yet (drawer), empty column (Board) — each has its own friendly copy and icon in the prototype, not just a blank area.
- **Drag feedback**: a column being dragged over gets a highlighted/dashed outline; the dragged card itself becomes semi-transparent and slightly rotated.
- **Quick-add**: is a multi-line textarea, not a single-line input, distinguishing it from the current MVP's simpler one-line quick-add.
- **Segmented controls** (status, priority) in the drawer apply their change immediately on click — there is no separate "Save" step for those two fields, unlike title/description which the current MVP saves via an explicit Save button.
- **Mobile nav**: sidebar becomes a slide-in drawer with a dimmed scrim, opened via a burger icon that only appears below the 920px breakpoint.

## 9. Technical Considerations

**Data model gaps vs. the current schema** (`server/Entities/TaskItem.cs`, `Project.cs`, `Enums.cs`): the current `TaskItem` has `Title, Description, ProjectId, Priority, Column, Position` and `BoardColumn` has three values (`ToDo, InProgress, Done`). Sprout's data (see `tm-data.jsx`) requires:
- `BoardColumn` extended with a fourth value, `Backlog`.
- A `Label` concept: tasks have zero-or-more labels from a fixed set (design/research/writing/bug/chore/health/learning in the prototype), each with a name and a color tone. Needs a new entity (or a simpler enum-array/join-table approach) plus DTO/API changes to `TasksController`.
- A `Subtask` concept: each task has zero-or-more ordered subtasks with text and a done flag. Needs a new entity, FK to `TaskItem`, and new endpoints (add subtask, toggle subtask) or folding into the task update payload.
- A `Comment` concept: each task has zero-or-more comments with author, text, and timestamp. Needs a new entity, FK to `TaskItem`, and new endpoints (list/add comment).
- An `Assignee`/`Person` concept: the prototype has a fixed cast (You, Sam Rivera, Jo Park). Given the Non-Goals above, this likely collapses to a single implicit "You" for v1 rather than a real `Person` entity — flagged as an open question below.

**Frontend structure**: the existing feature-folder convention (`client/src/app/features/board/`, `features/tasks/`, `features/projects/`) extends naturally with a new `features/dashboard/` for the Overview page, and the existing `TaskEditorDialogComponent` (Material dialog) would need to be replaced or supplemented by a drawer-style component (Material's `MatSidenav` or a custom slide-in panel) to match FR-19.

**Theming mechanism**: the prototype implements theme/density/accent/roundness entirely via CSS custom properties on a root element (`data-theme`, `data-density` attributes, inline `--accent`/`--radius` variables) — this maps cleanly onto Angular via a root-level directive/service toggling attributes and CSS variables, largely independent of Angular Material's own theming system. Persistence of these preferences (FR-31) needs a decision: browser `localStorage` (simplest, no backend change) vs. a new backend settings endpoint (unnecessary for a single local user, adds a migration for no real benefit) — `localStorage` is the natural fit given the app's local-only nature.

**Column reordering**: adding a `Backlog` column is a backend enum change plus an EF Core migration; existing tasks default to their current column (no backfill logic needed since `ToDo`/`InProgress`/`Done` are unaffected, and no existing task can already be in a "Backlog" state).

## 10. Success Metrics

Same qualitative framing as the original MVP PRD: this is a personal tool with no external adoption metrics. Success is the user actually preferring to open Sprout over falling back to an ad-hoc list, and the richer feature set (subtasks, labels, dashboard) getting used rather than ignored.

## 11. Milestones / Rollout

Given the scope gap between this and the current MVP, a suggested incremental path (not a commitment — to be finalized in a follow-up scoping pass):

1. **Visual restyle** — apply Sprout's typography, color palette (light theme only), spacing, and card/shadow treatment to the existing board, cards, and dialog, with no data-model or feature changes.
2. **Backlog column** — extend `BoardColumn` to four values; update board rendering and move logic.
3. **Labels** — add the label data model and multi-label tagging on cards and in the task editor.
4. **Subtasks** — add the subtask data model, checklist UI on the card and in the detail view.
5. **Detail drawer** — replace the modal editor with the slide-in drawer pattern, including segmented controls for status/priority.
6. **Comments/activity** — add the comment data model and the activity feed UI.
7. **Dashboard** — build the Overview page once the underlying data (subtasks, due dates, per-project stats) is in place.
8. **Personalization** — theme, density, accent, roundness, persisted to `localStorage`.
9. **Assignees** — only if/when multi-user or a "future collaborator" concept is explicitly decided on; otherwise never built, and assignee UI in the drawer/card is dropped or hard-coded to a single "You".

## 12. Open Questions / Assumptions

- **Assignees conflict with the single-user architecture.** The prototype shows three named people. Recommendation: treat "assignee" as out of scope until/unless the product direction explicitly changes to support multiple people — needs an explicit decision before any related implementation work starts.
- **Where do personalization settings persist?** Assumed `localStorage` (simplest, consistent with local-only architecture) rather than a new backend settings table — flagged for confirmation.
- **Labels: fixed set or user-managed?** The prototype ships a fixed, hardcoded label set (7 labels with preset colors). Whether the real app should let the user define/rename/color their own labels (mirroring how Projects work) or keep a fixed set is undecided.
- **Should subtasks/comments live on the task update payload or get their own endpoints?** Leaning toward dedicated endpoints (`POST /api/tasks/{id}/subtasks`, `PATCH /api/tasks/{id}/subtasks/{subId}`, `POST /api/tasks/{id}/comments`) to mirror the existing dedicated-move-endpoint pattern (`PATCH /api/tasks/{id}/move`) rather than overloading the general update endpoint — to be confirmed when this is actually scoped into implementation tasks.
- **Is the Dashboard "mark done" one-click action (FR-7) a real requirement or prototype flourish?** It's present in the source (`onToggleSub(t.id, null)` moves the task to Done) but wasn't explicitly discussed — kept as a functional requirement since it's directly observable in the prototype, but worth confirming during scoping.
- **Notes/description editing**: the prototype's drawer shows the description as static text with no visible edit affordance for it specifically (unlike the current MVP's editable description field) — assumed this is a prototype simplification, not an intentional removal of the ability to edit a task's description, and that editing should remain possible.
