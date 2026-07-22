import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { ColumnService } from './column.service';
import { Column } from './column.model';
import { environment } from '../../../environments/environment';

function makeColumn(overrides: Partial<Column> = {}): Column {
  return {
    id: 1,
    name: 'Backlog',
    hint: 'Ideas & someday',
    position: 0,
    isDefault: true,
    ...overrides,
  };
}

describe('ColumnService', () => {
  let service: ColumnService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(ColumnService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('columns starts as an empty array', () => {
    expect(service.columns()).toEqual([]);
  });

  it('load() populates columns from the API', () => {
    service.load();
    const seeded = [
      makeColumn({ id: 1, name: 'Backlog', position: 0 }),
      makeColumn({ id: 2, name: 'ToDo', hint: 'This week', position: 1 }),
    ];
    httpMock.expectOne(`${environment.apiBaseUrl}/columns`).flush(seeded);

    expect(service.columns()).toEqual(seeded);
  });

  it('create() posts the name and appends the result immutably', () => {
    service.load();
    httpMock.expectOne(`${environment.apiBaseUrl}/columns`).flush([makeColumn()]);
    const before = service.columns();

    const promise = service.create('Review');
    const req = httpMock.expectOne(`${environment.apiBaseUrl}/columns`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ name: 'Review' });
    const created = makeColumn({ id: 5, name: 'Review', hint: null, position: 1, isDefault: false });
    req.flush(created);

    return promise.then((result) => {
      expect(result).toEqual(created);
      expect(service.columns()).not.toBe(before);
      expect(service.columns()).toEqual([...before, created]);
    });
  });

  it('rename() puts the name and replaces only the matching entry immutably', () => {
    service.load();
    httpMock.expectOne(`${environment.apiBaseUrl}/columns`).flush([
      makeColumn({ id: 5, name: 'Review', hint: null, isDefault: false }),
      makeColumn({ id: 1 }),
    ]);
    const before = service.columns();

    const promise = service.rename(5, 'In Review');
    const req = httpMock.expectOne(`${environment.apiBaseUrl}/columns/5`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({ name: 'In Review' });
    const updated = makeColumn({ id: 5, name: 'In Review', hint: null, isDefault: false });
    req.flush(updated);

    return promise.then((result) => {
      expect(result).toEqual(updated);
      expect(service.columns()).not.toBe(before);
      expect(service.columns().find((c) => c.id === 5)).toEqual(updated);
      expect(service.columns().find((c) => c.id === 1)).toEqual(before.find((c) => c.id === 1));
    });
  });

  it('delete() removes the matching entry immutably', () => {
    service.load();
    httpMock.expectOne(`${environment.apiBaseUrl}/columns`).flush([
      makeColumn({ id: 5, name: 'Review', hint: null, isDefault: false }),
      makeColumn({ id: 1 }),
    ]);

    const promise = service.delete(5);
    const req = httpMock.expectOne(`${environment.apiBaseUrl}/columns/5`);
    expect(req.request.method).toBe('DELETE');
    req.flush(null);

    return promise.then(() => {
      expect(service.columns().find((c) => c.id === 5)).toBeUndefined();
      expect(service.columns()).toEqual([makeColumn({ id: 1 })]);
    });
  });

  it('reorder() patches orderedIds and replaces the full list with the response', () => {
    service.load();
    httpMock.expectOne(`${environment.apiBaseUrl}/columns`).flush([
      makeColumn({ id: 1, position: 0 }),
      makeColumn({ id: 2, name: 'ToDo', position: 1 }),
    ]);

    const promise = service.reorder([2, 1]);
    const req = httpMock.expectOne(`${environment.apiBaseUrl}/columns/reorder`);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ orderedIds: [2, 1] });
    const reordered = [
      makeColumn({ id: 2, name: 'ToDo', position: 0 }),
      makeColumn({ id: 1, position: 1 }),
    ];
    req.flush(reordered);

    return promise.then((result) => {
      expect(result).toEqual(reordered);
      expect(service.columns()).toEqual(reordered);
    });
  });
});
