import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule, Search, Shield, ShieldOff, Users } from 'lucide-angular';
import {
  AdminService,
  AdminUsuario,
  PaginatedResponse,
  UsuarioRol,
} from '../../../core/services/admin.service';
import { ToastService } from '../../../core/services/toast.service';
import { ButtonComponent } from '../../../shared/components/button/button.component';


interface EstadoFiltro {
  label: string;
  value: '' | 'activo' | 'inactivo';
}

@Component({
  selector: 'app-admin-usuarios',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule, ButtonComponent],
  template: `
    <div class="max-w-7xl mx-auto space-y-6">
      <section class="rounded-card border border-border-subtle bg-bg-surface/90 p-6 md:p-7">
        <div class="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
          <div>
            <p class="text-xs uppercase tracking-[0.25em] text-text-secondary">Administracion</p>
            <h1 class="text-3xl font-black tracking-tight mt-1">Usuarios</h1>
            <p class="text-text-secondary mt-2 max-w-2xl">
              Gestiona activaciones, roles y monitorea el estado de acceso del ecosistema.
            </p>
          </div>

          <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 min-w-[280px]">
            <div class="rounded-sm border border-border-subtle bg-bg-main/60 px-3 py-2">
              <p class="text-xs uppercase tracking-[0.18em] text-text-secondary">Total</p>
              <p class="text-xl font-black mt-1">{{ total() }}</p>
            </div>
            <div class="rounded-sm border border-border-subtle bg-bg-main/60 px-3 py-2">
              <p class="text-xs uppercase tracking-[0.18em] text-text-secondary">Activos</p>
              <p class="text-xl font-black mt-1 text-emerald-400">{{ activosCount() }}</p>
            </div>
            <div class="rounded-sm border border-border-subtle bg-bg-main/60 px-3 py-2">
              <p class="text-xs uppercase tracking-[0.18em] text-text-secondary">Inactivos</p>
              <p class="text-xl font-black mt-1 text-rose-400">{{ inactivosCount() }}</p>
            </div>
            <div class="rounded-sm border border-border-subtle bg-bg-main/60 px-3 py-2">
              <p class="text-xs uppercase tracking-[0.18em] text-text-secondary">Admins</p>
              <p class="text-xl font-black mt-1 text-accent-primary">{{ adminsCount() }}</p>
            </div>
          </div>
        </div>
      </section>

      <section class="rounded-card border border-border-subtle bg-bg-surface/90 p-5 md:p-6 space-y-5">
        <div class="flex flex-col xl:flex-row gap-3 xl:items-center xl:justify-between">
          <div class="relative w-full xl:max-w-md">
            <lucide-icon [img]="Search" [size]="16" class="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary"></lucide-icon>
            <input
              type="text"
              class="w-full pl-10 pr-3 py-2.5 bg-bg-main border border-border-subtle rounded-sm text-sm focus:outline-none focus:border-accent-primary"
              placeholder="Buscar por nombre o email"
              [(ngModel)]="searchText"
              (keyup.enter)="aplicarFiltros()"
            />
          </div>

          <div class="flex flex-wrap items-center gap-2">
            <select
              class="bg-bg-main border border-border-subtle rounded-sm px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent-primary"
              [(ngModel)]="rolFilter"
              (change)="aplicarFiltros()"
            >
              <option value="">Todos los roles</option>
              <option value="admin">Admin</option>
              <option value="cliente">Cliente</option>
            </select>

            <select
              class="bg-bg-main border border-border-subtle rounded-sm px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent-primary"
              [(ngModel)]="estadoFilter"
              (change)="aplicarFiltros()"
            >
              <option *ngFor="let option of estadoOpciones" [value]="option.value">{{ option.label }}</option>
            </select>

            <app-button variant="secondary" size="sm" (onClick)="aplicarFiltros()">Filtrar</app-button>
            <app-button variant="ghost" size="sm" (onClick)="resetFiltros()">Limpiar</app-button>
          </div>
        </div>

        <div class="overflow-x-auto border border-border-subtle rounded-card">
          <table class="w-full text-left text-sm min-w-[920px]">
            <thead class="bg-bg-main border-b border-border-subtle text-text-secondary uppercase tracking-[0.12em] text-[11px]">
              <tr>
                <th class="px-4 py-3">Usuario</th>
                <th class="px-4 py-3">Rol</th>
                <th class="px-4 py-3">Estado</th>
                <th class="px-4 py-3">Registro</th>
                <th class="px-4 py-3">Ultimo login</th>
                <th class="px-4 py-3 text-right">Acciones</th>
              </tr>
            </thead>

            <tbody class="divide-y divide-border-subtle">
              <tr *ngIf="loading()">
                <td colspan="6" class="px-4 py-8 text-center text-text-secondary">
                  Cargando usuarios...
                </td>
              </tr>

              <tr *ngFor="let user of usuarios()" class="hover:bg-bg-main/70 transition-colors">
                <td class="px-4 py-3">
                  <div class="flex items-center gap-3">
                    <div class="w-9 h-9 rounded-full border border-border-subtle bg-bg-main inline-flex items-center justify-center text-xs font-black text-accent-primary">
                      {{ initials(user) }}
                    </div>
                    <div>
                      <p class="font-semibold text-text-primary leading-tight">{{ user.nombre }} {{ user.apellido }}</p>
                      <p class="text-xs text-text-secondary">{{ user.email }}</p>
                    </div>
                  </div>
                </td>

                <td class="px-4 py-3">
                  <span class="inline-flex px-2.5 py-1 rounded-pill text-xs font-semibold"
                        [ngClass]="user.rol === 'admin' ? 'bg-accent-primary/15 text-accent-primary' : 'bg-sky-500/15 text-sky-300'">
                    {{ user.rol | uppercase }}
                  </span>
                </td>

                <td class="px-4 py-3">
                  <span class="inline-flex items-center gap-1.5 text-xs"
                        [ngClass]="user.activo ? 'text-emerald-400' : 'text-rose-400'">
                    <span class="w-1.5 h-1.5 rounded-full"
                          [ngClass]="user.activo ? 'bg-emerald-400' : 'bg-rose-400'"></span>
                    {{ user.activo ? 'Activo' : 'Inactivo' }}
                  </span>
                </td>

                <td class="px-4 py-3 text-text-secondary">{{ toDate(user.fecha_creacion) }}</td>
                <td class="px-4 py-3 text-text-secondary">{{ user.ultimo_login ? toDate(user.ultimo_login) : 'Sin registro' }}</td>

                <td class="px-4 py-3 text-right">
                  <button
                    type="button"
                    class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-pill text-xs border cursor-pointer transition-colors"
                    [ngClass]="user.activo
                      ? 'border-rose-500/40 text-rose-300 hover:bg-rose-500/10'
                      : 'border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/10'"
                    [disabled]="updatingId() === user.id"
                    (click)="toggleEstado(user)"
                  >
                    <lucide-icon [img]="user.activo ? ShieldOff : Shield" [size]="13"></lucide-icon>
                    {{ updatingId() === user.id ? 'Actualizando...' : user.activo ? 'Desactivar' : 'Activar' }}
                  </button>
                </td>
              </tr>

              <tr *ngIf="!loading() && usuarios().length === 0">
                <td colspan="6" class="px-4 py-8 text-center text-text-secondary">
                  No hay usuarios para los filtros aplicados.
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-sm">
          <p class="text-text-secondary">
            Pagina {{ page() }} de {{ totalPages() || 1 }} · {{ total() }} registros
          </p>
          <div class="flex items-center gap-2">
            <app-button variant="secondary" size="sm" [disabled]="page() <= 1 || loading()" (onClick)="changePage(page() - 1)">
              Anterior
            </app-button>
            <app-button variant="secondary" size="sm" [disabled]="page() >= totalPages() || loading()" (onClick)="changePage(page() + 1)">
              Siguiente
            </app-button>
          </div>
        </div>
      </section>
    </div>
  `,
  styles: []
})
export class AdminUsuariosComponent implements OnInit {
  private readonly adminService = inject(AdminService);
  private readonly toast = inject(ToastService);

  readonly Search = Search;
  readonly Users = Users;
  readonly Shield = Shield;
  readonly ShieldOff = ShieldOff;

  readonly estadoOpciones: EstadoFiltro[] = [
    { label: 'Todos', value: '' },
    { label: 'Activos', value: 'activo' },
    { label: 'Inactivos', value: 'inactivo' },
  ];

  readonly usuarios = signal<AdminUsuario[]>([]);
  readonly loading = signal(true);
  readonly updatingId = signal<string | null>(null);

  readonly total = signal(0);
  readonly page = signal(1);
  readonly pageSize = signal(10);
  readonly totalPages = signal(0);

  readonly activosCount = signal(0);
  readonly inactivosCount = signal(0);
  readonly adminsCount = signal(0);

  searchText = '';
  rolFilter: '' | UsuarioRol = '';
  estadoFilter: '' | 'activo' | 'inactivo' = '';

  ngOnInit(): void {
    this.cargarUsuarios();
  }

  aplicarFiltros(): void {
    this.page.set(1);
    this.cargarUsuarios();
  }

  resetFiltros(): void {
    this.searchText = '';
    this.rolFilter = '';
    this.estadoFilter = '';
    this.page.set(1);
    this.cargarUsuarios();
  }

  changePage(nextPage: number): void {
    if (nextPage < 1 || (this.totalPages() > 0 && nextPage > this.totalPages())) {
      return;
    }

    this.page.set(nextPage);
    this.cargarUsuarios();
  }

  toggleEstado(user: AdminUsuario): void {
    if (this.updatingId()) {
      return;
    }

    this.updatingId.set(user.id);

    this.adminService.updateUsuarioEstado(user.id, !user.activo).subscribe({
      next: () => {
        this.usuarios.update((list) =>
          list.map((item) =>
            item.id === user.id
              ? {
                  ...item,
                  activo: !item.activo,
                }
              : item
          )
        );
        this.recomputeLocalMetrics();
        this.updatingId.set(null);
        this.toast.success(`Usuario ${!user.activo ? 'activado' : 'desactivado'} correctamente.`);
      },
      error: () => {
        this.updatingId.set(null);
      },
    });
  }

  initials(user: AdminUsuario): string {
    return `${user.nombre.charAt(0)}${user.apellido.charAt(0)}`.toUpperCase();
  }

  toDate(value: string): string {
    const date = new Date(value);
    return new Intl.DateTimeFormat('es-PE', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      hour12: true
    }).format(date);
  }

  private cargarUsuarios(): void {
    this.loading.set(true);

    this.adminService.getUsuarios({
      page: this.page(),
      page_size: this.pageSize(),
      rol: this.rolFilter,
      activo: this.estadoToBoolean(this.estadoFilter),
      buscar: this.searchText.trim(),
    }).subscribe({
      next: (response) => {
        this.applyPagination(response);
        this.loading.set(false);
      },
      error: () => {
        this.usuarios.set([]);
        this.total.set(0);
        this.totalPages.set(0);
        this.recomputeLocalMetrics();
        this.loading.set(false);
      },
    });
  }

  private applyPagination(response: PaginatedResponse<AdminUsuario>): void {
    this.usuarios.set(response.items);
    this.total.set(response.total);
    this.page.set(response.page);
    this.pageSize.set(response.page_size);
    this.totalPages.set(response.total_pages);
    this.recomputeLocalMetrics();
  }

  private recomputeLocalMetrics(): void {
    const list = this.usuarios();
    this.activosCount.set(list.filter((user) => user.activo).length);
    this.inactivosCount.set(list.filter((user) => !user.activo).length);
    this.adminsCount.set(list.filter((user) => user.rol === 'admin').length);
  }

  private estadoToBoolean(value: '' | 'activo' | 'inactivo'): boolean | null {
    if (value === '') {
      return null;
    }

    return value === 'activo';
  }
}
