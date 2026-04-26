import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminService, PaginatedResponse } from '../../../core/services/admin.service';
import { ToastService } from '../../../core/services/toast.service';
import {
  Tag,
  Search,
  Plus,
  Pencil,
  Trash2,
  X,
  Loader,
  LucideAngularModule
} from 'lucide-angular';
import { ButtonComponent } from '../../../shared/components/button/button.component';

@Component({
  selector: 'app-admin-marcas',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule, ButtonComponent],
  template: `
    <div class="max-w-7xl mx-auto space-y-6">
      <section class="rounded-card border border-border-subtle bg-bg-surface/90 p-6 md:p-7">
        <div class="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <p class="text-xs uppercase tracking-[0.25em] text-text-secondary">Identidad</p>
            <h1 class="text-3xl font-black tracking-tight mt-1">Marcas</h1>
            <p class="text-text-secondary mt-2 max-w-2xl">
              Gestiona las marcas disponibles en tu tienda.
            </p>
          </div>

          <div class="flex items-center gap-3">
            <app-button variant="primary" (onClick)="abrirModal()">
              <lucide-icon [img]="Plus" [size]="16" class="mr-2"></lucide-icon>
              Nueva Marca
            </app-button>
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
              placeholder="Buscar marca..."
              [(ngModel)]="searchText"
              (keyup.enter)="aplicarFiltro()"
            />
          </div>
          
          <div class="flex flex-wrap items-center gap-2">
            <app-button variant="secondary" size="sm" (onClick)="aplicarFiltro()">Filtrar</app-button>
            <app-button variant="ghost" size="sm" (onClick)="limpiarFiltro()">Limpiar</app-button>
          </div>
        </div>

        <div class="overflow-x-auto border border-border-subtle rounded-card">
          <table class="w-full text-left text-sm min-w-[700px]">
            <thead class="bg-bg-main border-b border-border-subtle text-text-secondary uppercase tracking-[0.12em] text-[11px]">
              <tr>
                <th class="px-4 py-3">ID</th>
                <th class="px-4 py-3">Nombre</th>
                <th class="px-4 py-3">Slug</th>
                <th class="px-4 py-3">Estado</th>
                <th class="px-4 py-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-border-subtle">
              <tr *ngIf="loading()">
                <td colspan="5" class="px-4 py-8 text-center text-text-secondary">Cargando marcas...</td>
              </tr>

              <tr *ngFor="let item of filteredMarcas()" class="hover:bg-bg-main/70 transition-colors">
                <td class="px-4 py-3 text-text-secondary">#{{ item.id }}</td>
                <td class="px-4 py-3 font-semibold">{{ item.nombre }}</td>
                <td class="px-4 py-3 text-text-secondary text-xs font-mono">{{ item.slug }}</td>
                <td class="px-4 py-3">
                  <span class="inline-flex px-2 py-1 rounded-sm text-[10px] uppercase font-bold tracking-wider"
                        [ngClass]="item.activo ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'">
                    {{ item.activo ? 'Activo' : 'Inactivo' }}
                  </span>
                </td>
                <td class="px-4 py-3 text-right">
                  <div class="flex items-center justify-end gap-1">
                    <button
                      type="button"
                      class="p-1.5 rounded-sm hover:bg-bg-main text-text-secondary hover:text-accent-primary transition-colors"
                      (click)="abrirModal(item)"
                      title="Editar"
                    >
                      <lucide-icon [img]="Pencil" [size]="16"></lucide-icon>
                    </button>
                    <button
                      type="button"
                      class="p-1.5 rounded-sm hover:bg-rose-500/10 text-text-secondary hover:text-rose-500 transition-colors"
                      (click)="toggleEstado(item)"
                      [title]="item.activo ? 'Desactivar' : 'Activar'"
                      [disabled]="updatingId() === item.id"
                    >
                      <lucide-icon [img]="updatingId() === item.id ? Loader : (item.activo ? Trash2 : Plus)" [size]="16" [ngClass]="{'animate-spin': updatingId() === item.id}"></lucide-icon>
                    </button>
                  </div>
                </td>
              </tr>

              <tr *ngIf="!loading() && filteredMarcas().length === 0">
                <td colspan="5" class="px-4 py-8 text-center text-text-secondary">
                  No hay marcas registradas.
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-sm">
          <p class="text-text-secondary">
            Página {{ page() }} de {{ totalPages() || 1 }} · {{ total() }} registros
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

      <!-- Modal Crear/Editar -->
      <div *ngIf="showModal()" class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
        <div class="bg-bg-surface border border-border-subtle rounded-card w-full max-w-md shadow-2xl overflow-hidden zoom-in-95">
          <div class="flex items-center justify-between p-5 border-b border-border-subtle bg-bg-main/50">
            <h2 class="text-lg font-bold">{{ formMarca.id ? 'Editar Marca' : 'Nueva Marca' }}</h2>
            <button (click)="cerrarModal()" class="p-1.5 text-text-secondary hover:text-text-primary rounded-sm hover:bg-bg-main transition-colors">
              <lucide-icon [img]="X" [size]="20"></lucide-icon>
            </button>
          </div>
          
          <div class="p-5 space-y-4">
            <div class="space-y-1.5">
              <label class="text-xs uppercase tracking-wider text-text-secondary font-semibold">Nombre</label>
              <input type="text" [(ngModel)]="formMarca.nombre" class="w-full bg-bg-main border border-border-subtle rounded-sm px-3 py-2 text-sm focus:outline-none focus:border-accent-primary" placeholder="Ej. Samsung">
            </div>
          </div>
          
          <div class="p-5 border-t border-border-subtle bg-bg-main/50 flex justify-end gap-3">
            <app-button variant="ghost" (onClick)="cerrarModal()">Cancelar</app-button>
            <app-button variant="primary" (onClick)="guardarMarca()" [disabled]="saving()">
              {{ saving() ? 'Guardando...' : 'Guardar' }}
            </app-button>
          </div>
        </div>
      </div>
    </div>
  `
})
export class AdminMarcasComponent implements OnInit {
  private readonly adminService = inject(AdminService);
  private readonly toast = inject(ToastService);

  readonly Tag = Tag;
  readonly Search = Search;
  readonly Plus = Plus;
  readonly Pencil = Pencil;
  readonly Trash2 = Trash2;
  readonly X = X;
  readonly Loader = Loader;

  readonly marcas = signal<any[]>([]);
  readonly filteredMarcas = signal<any[]>([]);
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly updatingId = signal<number | null>(null);

  readonly page = signal(1);
  readonly pageSize = signal(10);
  readonly total = signal(0);
  readonly totalPages = signal(0);

  searchText = '';
  showModal = signal(false);
  
  formMarca: any = { id: null, nombre: '' };

  ngOnInit(): void {
    this.cargarMarcas();
  }

  cargarMarcas(): void {
    this.loading.set(true);
    this.adminService.getMarcasPaginadas(this.page(), this.pageSize()).subscribe({
      next: (res) => {
        this.marcas.set(res.items);
        this.total.set(res.total);
        this.totalPages.set(res.total_pages);
        this.aplicarFiltroLocal();
        this.loading.set(false);
      },
      error: () => {
        this.toast.error('Error al cargar marcas');
        this.loading.set(false);
      }
    });
  }

  aplicarFiltro(): void {
    this.aplicarFiltroLocal();
  }

  limpiarFiltro(): void {
    this.searchText = '';
    this.aplicarFiltroLocal();
  }

  aplicarFiltroLocal(): void {
    const term = this.searchText.trim().toLowerCase();
    if (!term) {
      this.filteredMarcas.set(this.marcas());
      return;
    }
    this.filteredMarcas.set(
      this.marcas().filter(m => m.nombre.toLowerCase().includes(term) || m.slug.toLowerCase().includes(term))
    );
  }

  changePage(nextPage: number): void {
    if (nextPage < 1 || (this.totalPages() > 0 && nextPage > this.totalPages())) return;
    this.page.set(nextPage);
    this.cargarMarcas();
  }

  abrirModal(item?: any): void {
    if (item) {
      this.formMarca = { id: item.id, nombre: item.nombre };
    } else {
      this.formMarca = { id: null, nombre: '' };
    }
    this.showModal.set(true);
  }

  cerrarModal(): void {
    this.showModal.set(false);
    this.formMarca = { id: null, nombre: '' };
  }

  guardarMarca(): void {
    if (!this.formMarca.nombre.trim()) {
      this.toast.error('El nombre es requerido');
      return;
    }

    this.saving.set(true);
    const obs = this.formMarca.id 
      ? this.adminService.updateMarca(this.formMarca.id, { nombre: this.formMarca.nombre })
      : this.adminService.createMarca({ nombre: this.formMarca.nombre });

    obs.subscribe({
      next: () => {
        this.toast.success(`Marca ${this.formMarca.id ? 'actualizada' : 'creada'} correctamente`);
        this.cerrarModal();
        this.saving.set(false);
        this.cargarMarcas();
      },
      error: (err) => {
        this.toast.error(err.error?.detail || 'Error al guardar');
        this.saving.set(false);
      }
    });
  }

  toggleEstado(item: any): void {
    if (this.updatingId()) return;
    this.updatingId.set(item.id);

    const nuevoEstado = !item.activo;
    
    const obs = nuevoEstado 
      ? this.adminService.updateMarca(item.id, { activo: true })
      : this.adminService.deleteMarca(item.id);

    obs.subscribe({
      next: () => {
        this.toast.success(`Marca ${nuevoEstado ? 'activada' : 'desactivada'}`);
        this.updatingId.set(null);
        this.cargarMarcas();
      },
      error: (err) => {
        this.toast.error(err.error?.detail || 'Error al actualizar estado');
        this.updatingId.set(null);
      }
    });
  }
}
