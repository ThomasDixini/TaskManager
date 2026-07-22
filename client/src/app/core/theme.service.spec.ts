import { TestBed } from '@angular/core/testing';
import { ThemeService } from './theme.service';

describe('ThemeService', () => {
  beforeEach(() => {
    localStorage.removeItem('sprout-theme-prefs');
    document.documentElement.removeAttribute('data-theme');
    document.documentElement.removeAttribute('data-density');
    document.documentElement.style.removeProperty('--accent');
    document.documentElement.style.removeProperty('--radius');
    TestBed.configureTestingModule({});
  });

  it('defaults to cream/regular/#E8674C/18 with no stored prefs', () => {
    const service = TestBed.inject(ThemeService);
    expect(service.prefs()).toEqual({
      theme: 'cream',
      density: 'regular',
      accent: '#E8674C',
      roundness: 18,
    });
  });

  it('setTheme updates the signal, the DOM attribute, and localStorage', () => {
    const service = TestBed.inject(ThemeService);
    service.setTheme('dusk');
    expect(service.prefs().theme).toBe('dusk');
    expect(document.documentElement.getAttribute('data-theme')).toBe('dusk');
    expect(JSON.parse(localStorage.getItem('sprout-theme-prefs')!).theme).toBe('dusk');
  });

  it('setDensity updates the signal and the data-density attribute', () => {
    const service = TestBed.inject(ThemeService);
    service.setDensity('compact');
    expect(service.prefs().density).toBe('compact');
    expect(document.documentElement.getAttribute('data-density')).toBe('compact');
  });

  it('setAccent updates the --accent CSS variable', () => {
    const service = TestBed.inject(ThemeService);
    service.setAccent('#3F9E86');
    expect(service.prefs().accent).toBe('#3F9E86');
    expect(document.documentElement.style.getPropertyValue('--accent')).toBe('#3F9E86');
  });

  it('setRoundness updates the --radius CSS variable in px', () => {
    const service = TestBed.inject(ThemeService);
    service.setRoundness(8);
    expect(service.prefs().roundness).toBe(8);
    expect(document.documentElement.style.getPropertyValue('--radius')).toBe('8px');
  });

  it('a freshly-constructed service picks up previously-persisted prefs', () => {
    const first = TestBed.inject(ThemeService);
    first.setTheme('dusk');
    first.setAccent('#D06B92');

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    const second = TestBed.inject(ThemeService);

    expect(second.prefs().theme).toBe('dusk');
    expect(second.prefs().accent).toBe('#D06B92');
  });
});
