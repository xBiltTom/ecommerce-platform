import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminService, PaginatedResponse } from '../../../core/services/admin.service';
import { ToastService } from '../../../core/services/toast.service';
import {
  FolderTree,
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
  selector: 'app-admin-categorias',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule, ButtonComponent],
  template: `
    <div class="max-w-7xl mx-auto space-y-6">
      <section class="rounded-card border border-border-subtle bg-bg-surface/90 p-6 md:p-7">
        <div class="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <p class="text-xs uppercase tracking-[0.25em] text-text-secondary">Taxonomia</p>
            <h1 class="text-3xl font-black tracking-tight mt-1">Categorías</h1>
            <p class="text-text-secondary mt-2 max-w-2xl">
              Organiza tu catálogo y mejora la navegación de los clientes.
            </p>
          </div>

          <div class="flex items-center gap-3">
            <app-button variant="primary" (onClick)="abrirModal()">
              <lucide-icon [img]="Plus" [size]="16" class="mr-2"></lucide-icon>
              Nueva Categoría
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
              placeholder="Buscar categoría..."
              [(ngModel)]="searchText"
              (keyup.enter)="aplicarFiltro()"
            />
          </div>
          
          <div class="flex flex-wrap items-center gap-2">
            <select
              class="bg-bg-main border border-border-subtle rounded-sm px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent-primary"
              [value]="estadoFilter()"
              (change)="onEstadoChange($event)"
            >
              <option value="">Todos los estados</option>
              <option value="true">Activos</option>
              <option value="false">Inactivos</option>
            </select>
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
                <td colspan="5" class="px-4 py-8 text-center text-text-secondary">Cargando categorías...</td>
              </tr>

              <tr *ngFor="let item of filteredCategorias()" class="hover:bg-bg-main/70 transition-colors">
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

              <tr *ngIf="!loading() && filteredCategorias().length === 0">
                <td colspan="5" class="px-4 py-8 text-center text-text-secondary">
                  No hay categorías registradas.
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
            <h2 class="text-lg font-bold">{{ formCategoria.id ? 'Editar Categoría' : 'Nueva Categoría' }}</h2>
            <button (click)="cerrarModal()" class="p-1.5 text-text-secondary hover:text-text-primary rounded-sm hover:bg-bg-main transition-colors">
              <lucide-icon [img]="X" [size]="20"></lucide-icon>
            </button>
          </div>
          
          <div class="p-5 space-y-4">
            <div class="space-y-1.5">
              <label class="text-xs uppercase tracking-wider text-text-secondary font-semibold">Nombre</label>
              <input type="text" [(ngModel)]="formCategoria.nombre" class="w-full bg-bg-main border border-border-subtle rounded-sm px-3 py-2 text-sm focus:outline-none focus:border-accent-primary" placeholder="Ej. Laptops">
            </div>
            
            <div class="space-y-1.5">
              <label class="text-xs uppercase tracking-wider text-text-secondary font-semibold">Descripción (Opcional)</label>
              <textarea [(ngModel)]="formCategoria.descripcion" class="w-full bg-bg-main border border-border-subtle rounded-sm px-3 py-2 text-sm focus:outline-none focus:border-accent-primary resize-none" rows="3" placeholder="Descripción de la categoría..."></textarea>
            </div>
          </div>
          
          <div class="p-5 border-t border-border-subtle bg-bg-main/50 flex justify-end gap-3">
            <app-button variant="ghost" (onClick)="cerrarModal()">Cancelar</app-button>
            <app-button variant="primary" (onClick)="guardarCategoria()" [disabled]="saving()">
              {{ saving() ? 'Guardando...' : 'Guardar' }}
            </app-button>
          </div>
        </div>
      </div>
    </div>
  `
})
export class AdminCategoriasComponent implements OnInit {
  private readonly adminService = inject(AdminService);
  private readonly toast = inject(ToastService);

  readonly FolderTree = FolderTree;
  readonly Search = Search;
  readonly Plus = Plus;
  readonly Pencil = Pencil;
  readonly Trash2 = Trash2;
  readonly X = X;
  readonly Loader = Loader;

  readonly categorias = signal<any[]>([]);
  readonly filteredCategorias = signal<any[]>([]);
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly updatingId = signal<number | null>(null);

  readonly page = signal(1);
  readonly pageSize = signal(10);
  readonly total = signal(0);
  readonly totalPages = signal(0);

  searchText = '';
  showModal = signal(false);
  estadoFilter = signal<string>('');
  
  formCategoria: any = { id: null, nombre: '', descripcion: '' };

  ngOnInit(): void {
    this.cargarCategorias();
  }

  cargarCategorias(): void {
    this.loading.set(true);
    const activo = this.toBooleanNullable(this.estadoFilter());
    this.adminService.getCategoriasPaginadas(this.page(), this.pageSize(), activo).subscribe({
      next: (res) => {
        this.categorias.set(res.items);
        this.total.set(res.total);
        this.totalPages.set(res.total_pages);
        this.aplicarFiltroLocal();
        this.loading.set(false);
      },
      error: () => {
        this.toast.error('Error al cargar categorías');
        this.loading.set(false);
      }
    });
  }

  aplicarFiltro(): void {
    this.page.set(1);
    this.cargarCategorias();
  }

  limpiarFiltro(): void {
    this.searchText = '';
    this.estadoFilter.set('');
    this.page.set(1);
    this.cargarCategorias();
  }

  onEstadoChange(event: Event): void {
    const target = event.target as HTMLSelectElement;
    this.estadoFilter.set(target.value);
  }

  aplicarFiltroLocal(): void {
    const term = this.searchText.trim().toLowerCase();
    if (!term) {
      this.filteredCategorias.set(this.categorias());
      return;
    }
    this.filteredCategorias.set(
      this.categorias().filter(c => c.nombre.toLowerCase().includes(term) || c.slug.toLowerCase().includes(term))
    );
  }

  changePage(nextPage: number): void {
    if (nextPage < 1 || (this.totalPages() > 0 && nextPage > this.totalPages())) return;
    this.page.set(nextPage);
    this.cargarCategorias();
  }

  abrirModal(item?: any): void {
    if (item) {
      this.formCategoria = { id: item.id, nombre: item.nombre, descripcion: item.descripcion || '' };
    } else {
      this.formCategoria = { id: null, nombre: '', descripcion: '' };
    }
    this.showModal.set(true);
  }

  cerrarModal(): void {
    this.showModal.set(false);
    this.formCategoria = { id: null, nombre: '', descripcion: '' };
  }

  guardarCategoria(): void {
    if (!this.formCategoria.nombre.trim()) {
      this.toast.error('El nombre es requerido');
      return;
    }

    this.saving.set(true);
    const obs = this.formCategoria.id 
      ? this.adminService.updateCategoria(this.formCategoria.id, { nombre: this.formCategoria.nombre, descripcion: this.formCategoria.descripcion })
      : this.adminService.createCategoria({ nombre: this.formCategoria.nombre, descripcion: this.formCategoria.descripcion });

    obs.subscribe({
      next: () => {
        this.toast.success(`Categoría ${this.formCategoria.id ? 'actualizada' : 'creada'} correctamente`);
        this.cerrarModal();
        this.saving.set(false);
        this.cargarCategorias();
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
    
    // Si se está desactivando, el backend usa deleteCategoria (soft delete).
    // Si se está activando, usamos updateCategoria.
    const obs = nuevoEstado 
      ? this.adminService.updateCategoria(item.id, { activo: true })
      : this.adminService.deleteCategoria(item.id);

    obs.subscribe({
      next: () => {
        this.toast.success(`Categoría ${nuevoEstado ? 'activada' : 'desactivada'}`);
        this.updatingId.set(null);
        this.cargarCategorias();
      },
      error: (err) => {
        this.toast.error(err.error?.detail || 'Error al actualizar estado');
        this.updatingId.set(null);
      }
    });
  }

  private toBooleanNullable(value: string): boolean | null | '' {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return '';
  }
}
