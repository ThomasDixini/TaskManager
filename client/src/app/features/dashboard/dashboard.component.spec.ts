import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';

import { DashboardComponent } from './dashboard.component';
import { TaskService } from '../tasks/task.service';
import { Task } from '../tasks/task.model';
import { environment } from '../../../environments/environment';

function makeTask(overrides: Partial<Task>): Task {
  return {
    id: 1,
    title: 'Task',
    description: null,
    projectId: null,
    priority: null,
    column: 'Backlog',
    position: 0,
    dueDate: null,
    labelIds: [],
    subtaskTotal: 0,
    subtaskDone: 0,
    commentCount: 0,
    ...overrides,
  };
}

describe('DashboardComponent', () => {
  let taskService: TaskService;
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DashboardComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    }).compileComponents();

    taskService = TestBed.inject(TaskService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should create', () => {
    const fixture = TestBed.createComponent(DashboardComponent);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('counts a task in a custom column as active/open, but not "in progress" or "completed"', () => {
    const tasks: Task[] = [
      makeTask({ id: 1, column: 'Backlog' }),
      makeTask({ id: 2, column: 'InProgress' }),
      makeTask({ id: 3, column: 'Review' }), // custom column between InProgress and Done
      makeTask({ id: 4, column: 'Done' }),
    ];

    const fixture = TestBed.createComponent(DashboardComponent);
    fixture.detectChanges(); // triggers ngOnInit -> taskService.load() / projectService.load()

    const tasksReq = httpMock.expectOne((req) => req.url === `${environment.apiBaseUrl}/tasks`);
    tasksReq.flush(tasks);

    const projectsReq = httpMock.expectOne(`${environment.apiBaseUrl}/projects`);
    projectsReq.flush([]);

    const component = fixture.componentInstance;
    const reviewTask = tasks.find((t) => t.id === 3)!;

    // Active/open: everything not literally in the Done column.
    expect(component.active()).toContain(reviewTask);
    expect(component.active().length).toBe(3);

    // "In progress" means specifically the InProgress column — the custom
    // Review-column task must NOT be counted as in progress.
    expect(component.doing()).not.toContain(reviewTask);
    expect(component.doing().length).toBe(1);

    // "Completed" means specifically the Done column — the custom
    // Review-column task must NOT be counted as completed.
    expect(component.done()).not.toContain(reviewTask);
    expect(component.done().length).toBe(1);
  });
});
