import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { LabelService } from './label.service';
import { Label } from './label.model';
import { environment } from '../../../environments/environment';

function makeLabel(overrides: Partial<Label> = {}): Label {
  return {
    id: 'bug',
    name: 'Bug',
    tone: 'rose',
    ...overrides,
  };
}

describe('LabelService', () => {
  let service: LabelService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(LabelService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('labels starts as an empty array', () => {
    expect(service.labels()).toEqual([]);
  });

  it('create() posts name/tone and appends the result immutably', () => {
    service.load();
    httpMock.expectOne(`${environment.apiBaseUrl}/labels`).flush([makeLabel()]);
    const before = service.labels();

    const promise = service.create('Waiting on Client', 'amber');
    const req = httpMock.expectOne(`${environment.apiBaseUrl}/labels`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ name: 'Waiting on Client', tone: 'amber' });
    const created = makeLabel({ id: 'waiting-on-client', name: 'Waiting on Client', tone: 'amber' });
    req.flush(created);

    return promise.then((result) => {
      expect(result).toEqual(created);
      expect(service.labels()).not.toBe(before);
      expect(service.labels()).toEqual([...before, created]);
    });
  });

  it('update() puts name/tone and replaces only the matching entry immutably', () => {
    service.load();
    httpMock.expectOne(`${environment.apiBaseUrl}/labels`).flush([
      makeLabel({ id: 'bug', name: 'Bug', tone: 'rose' }),
      makeLabel({ id: 'chore', name: 'Chore', tone: 'slate' }),
    ]);
    const before = service.labels();

    const promise = service.update('bug', 'Bugs', 'coral');
    const req = httpMock.expectOne(`${environment.apiBaseUrl}/labels/bug`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({ name: 'Bugs', tone: 'coral' });
    const updated = makeLabel({ id: 'bug', name: 'Bugs', tone: 'coral' });
    req.flush(updated);

    return promise.then((result) => {
      expect(result).toEqual(updated);
      expect(service.labels()).not.toBe(before);
      expect(service.labels().find((l) => l.id === 'bug')).toEqual(updated);
      expect(service.labels().find((l) => l.id === 'chore')).toEqual(
        before.find((l) => l.id === 'chore')
      );
    });
  });

  it('delete() removes the matching entry immutably', () => {
    service.load();
    httpMock.expectOne(`${environment.apiBaseUrl}/labels`).flush([
      makeLabel({ id: 'bug' }),
      makeLabel({ id: 'chore', name: 'Chore', tone: 'slate' }),
    ]);

    const promise = service.delete('bug');
    const req = httpMock.expectOne(`${environment.apiBaseUrl}/labels/bug`);
    expect(req.request.method).toBe('DELETE');
    req.flush(null);

    return promise.then(() => {
      expect(service.labels().find((l) => l.id === 'bug')).toBeUndefined();
      expect(service.labels()).toEqual([makeLabel({ id: 'chore', name: 'Chore', tone: 'slate' })]);
    });
  });
});
