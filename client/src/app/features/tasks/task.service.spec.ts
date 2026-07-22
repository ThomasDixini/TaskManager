import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { TaskService } from './task.service';
import { Task } from './task.model';
import { environment } from '../../../environments/environment';

function makeTask(overrides: Partial<Task> = {}): Task {
  return {
    id: 1,
    title: 'Sample',
    description: null,
    projectId: null,
    priority: null,
    column: 'ToDo',
    position: 0,
    dueDate: null,
    labelIds: [],
    subtaskTotal: 0,
    subtaskDone: 0,
    commentCount: 0,
    ...overrides,
  };
}

describe('TaskService', () => {
  let service: TaskService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(TaskService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('patchLocal updates only the matching task, immutably, once the list is loaded', () => {
    service.load();
    httpMock.expectOne(`${environment.apiBaseUrl}/tasks`).flush([
      makeTask({ id: 1, subtaskTotal: 1, subtaskDone: 0, commentCount: 0 }),
      makeTask({ id: 2, subtaskTotal: 0, subtaskDone: 0, commentCount: 0 }),
    ]);

    const before = service.tasks();
    service.patchLocal(1, { subtaskTotal: 2, subtaskDone: 1 });
    const after = service.tasks();

    expect(after).not.toBe(before);
    expect(after.find((t) => t.id === 1)).toEqual(
      expect.objectContaining({ subtaskTotal: 2, subtaskDone: 1 })
    );
    expect(after.find((t) => t.id === 2)).toEqual(before.find((t) => t.id === 2));
  });

  it('patchLocal is a no-op when the id is not in the current list', () => {
    service.load();
    httpMock.expectOne(`${environment.apiBaseUrl}/tasks`).flush([makeTask({ id: 1 })]);

    const before = service.tasks();
    service.patchLocal(999, { commentCount: 5 });

    expect(service.tasks()).toEqual(before);
  });

  it('getById does not modify the tasks list signal', () => {
    service.load();
    httpMock.expectOne(`${environment.apiBaseUrl}/tasks`).flush([makeTask({ id: 1 })]);
    const before = service.tasks();

    const promise = service.getById(1);
    httpMock
      .expectOne(`${environment.apiBaseUrl}/tasks/1`)
      .flush({ ...makeTask({ id: 1 }), subtasks: [], comments: [] });

    return promise.then(() => {
      expect(service.tasks()).toBe(before);
    });
  });
});
