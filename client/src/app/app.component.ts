import { CommonModule } from '@angular/common';
import { Component, Injectable, OnInit, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

import { Project } from './features/projects/project.model';
import { ProjectService } from './features/projects/project.service';
import { SettingsPanelComponent } from './features/settings/settings-panel.component';

/**
 * Shared filter/search state consumed by both the app shell (sidebar +
 * topbar) and the routed `BoardComponent`. The sidebar's project picker and
 * the topbar's search box write to this; the board reads it to narrow the
 * tasks it displays.
 */
@Injectable({ providedIn: 'root' })
export class BoardFilterState {
  readonly selectedProjectId = signal<number | null>(null);
  readonly searchTerm = signal<string>('');
}

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    MatButtonModule,
    MatIconModule,
    MatMenuModule,
    MatSidenavModule,
    MatFormFieldModule,
    MatInputModule,
    SettingsPanelComponent,
  ],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})
export class AppComponent implements OnInit {
  protected readonly title = 'client';

  readonly sidebarOpen = signal(true);
  readonly searchTerm = signal('');

  readonly projects = computed<Project[]>(() => this.projectService.projects());

  constructor(
    protected readonly projectService: ProjectService,
    protected readonly filterState: BoardFilterState,
    private readonly router: Router
  ) {}

  ngOnInit(): void {
    this.projectService.load();
  }

  toggleSidebar(): void {
    this.sidebarOpen.update((open) => !open);
  }

  selectProject(projectId: number | null): void {
    this.filterState.selectedProjectId.set(projectId);
    this.router.navigate(['/board']);
  }

  isProjectSelected(projectId: number | null): boolean {
    return this.filterState.selectedProjectId() === projectId;
  }

  onSearchInput(value: string): void {
    this.searchTerm.set(value);
    this.filterState.searchTerm.set(value);
    if (value.trim().length > 0) {
      this.router.navigate(['/board']);
    }
  }
}
