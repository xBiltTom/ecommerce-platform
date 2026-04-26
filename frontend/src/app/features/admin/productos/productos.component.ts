import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import {
  AdminProductoList,
  AdminService,
  PaginatedResponse,
  ProductoCatalogo,
} from '../../../core/services/admin.service';
import {
  Boxes,
  Check,
  Edit3,
  Loader,
  LucideAngularModule,
  Plus,
  Search,
  Trash2,
  X,
} from 'lucide-angular';
import { ButtonComponent } from '../../../shared/components/button/button.component';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-admin-productos',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, LucideAngularModule, ButtonComponent],
  template: `
    <div class="max-w-7xl mx-auto space-y-6">
      <section class="rounded-card border border-border-subtle bg-bg-surface/90 p-6 md:p-7">
        <div class="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <p class="text-xs uppercase tracking-[0.25em] text-text-secondary">Catalogo</p>
            <h1 class="text-3xl font-black tracking-tight mt-1">Productos</h1>
            <p class="text-text-secondary mt-2 max-w-2xl">
              Crea, edita o desactiva SKUs del inventario principal con control fino de precio y stock minimo.
            </p>
          </div>

          <div class="grid grid-cols-2 sm:grid-cols-3 gap-3 min-w-[260px]">
            <div class="rounded-sm border border-border-subtle bg-bg-main/60 px-3 py-2">
              <p class="text-xs uppercase tracking-[0.18em] text-text-secondary">Total</p>
              <p class="text-xl font-black mt-1">{{ total() }}</p>
            </div>
            <div class="rounded-sm border border-border-subtle bg-bg-main/60 px-3 py-2">
              <p class="text-xs uppercase tracking-[0.18em] text-text-secondary">Activos</p>
              <p class="text-xl font-black mt-1 text-emerald-400">{{ activosCount() }}</p>
            </div>
            <div class="rounded-sm border border-border-subtle bg-bg-main/60 px-3 py-2">
              <p class="text-xs uppercase tracking-[0.18em] text-text-secondary">Sin stock</p>
              <p class="text-xl font-black mt-1 text-rose-400">{{ sinStockCount() }}</p>
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
              placeholder="Buscar por nombre o SKU"
              [value]="searchText()"
              (input)="onSearchInput($event)"
              (keyup.enter)="aplicarFiltros()"
            />
          </div>

          <div class="flex flex-wrap items-center gap-2">
            <select
              class="bg-bg-main border border-border-subtle rounded-sm px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent-primary"
              [value]="categoriaFilter()"
              (change)="onCategoriaChange($event)"
            >
              <option value="">Todas las categorias</option>
              <option *ngFor="let categoria of categorias()" [value]="categoria.id">{{ categoria.nombre }}</option>
            </select>

            <select
              class="bg-bg-main border border-border-subtle rounded-sm px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent-primary"
              [value]="marcaFilter()"
              (change)="onMarcaChange($event)"
            >
              <option value="">Todas las marcas</option>
              <option *ngFor="let marca of marcas()" [value]="marca.id">{{ marca.nombre }}</option>
            </select>

            <app-button variant="secondary" size="sm" (onClick)="aplicarFiltros()">Filtrar</app-button>
            <app-button variant="ghost" size="sm" (onClick)="resetFiltros()">Limpiar</app-button>
            <app-button variant="primary" size="sm" (onClick)="abrirModalCrear()">
              <span class="inline-flex items-center gap-1.5">
                <lucide-icon [img]="Plus" [size]="13"></lucide-icon>
                Nuevo
              </span>
            </app-button>
          </div>
        </div>

        <div class="overflow-x-auto border border-border-subtle rounded-card">
          <table class="w-full text-left text-sm min-w-[980px]">
            <thead class="bg-bg-main border-b border-border-subtle text-text-secondary uppercase tracking-[0.12em] text-[11px]">
              <tr>
                <th class="px-4 py-3">Producto</th>
                <th class="px-4 py-3">SKU</th>
                <th class="px-4 py-3">Categoria / Marca</th>
                <th class="px-4 py-3">Precio</th>
                <th class="px-4 py-3">Stock</th>
                <th class="px-4 py-3">Estado</th>
                <th class="px-4 py-3 text-right">Acciones</th>
              </tr>
            </thead>

            <tbody class="divide-y divide-border-subtle">
              <tr *ngIf="loading()">
                <td colspan="7" class="px-4 py-8 text-center text-text-secondary">Cargando productos...</td>
              </tr>

              <tr *ngFor="let product of productos()" class="hover:bg-bg-main/70 transition-colors">
                <td class="px-4 py-3">
                  <div class="flex items-center gap-3">
                    <div class="w-10 h-10 rounded-sm border border-border-subtle bg-bg-main overflow-hidden flex items-center justify-center">
                      <img *ngIf="product.imagen_url" [src]="product.imagen_url" [alt]="product.nombre" class="w-full h-full object-cover" />
                      <lucide-icon *ngIf="!product.imagen_url" [img]="Boxes" [size]="16" class="text-text-secondary"></lucide-icon>
                    </div>
                    <div>
                      <p class="font-semibold text-text-primary line-clamp-1">{{ product.nombre }}</p>
                      <p class="text-xs text-text-secondary line-clamp-1">Slug: {{ product.slug }}</p>
                    </div>
                  </div>
                </td>

                <td class="px-4 py-3 text-text-secondary">{{ product.sku }}</td>

                <td class="px-4 py-3">
                  <p class="text-text-primary">{{ product.categoria_nombre || 'Sin categoria' }}</p>
                  <p class="text-xs text-text-secondary">{{ product.marca_nombre || 'Sin marca' }}</p>
                </td>

                <td class="px-4 py-3">
                  <p class="font-semibold">{{ (product.precio_oferta || product.precio) | currency:'PEN':'S/ ' }}</p>
                  <p *ngIf="product.precio_oferta" class="text-xs line-through text-text-secondary">{{ product.precio | currency:'PEN':'S/ ' }}</p>
                </td>

                <td class="px-4 py-3">
                  <span [ngClass]="product.stock_disponible > 0 ? 'text-emerald-400' : 'text-rose-400'" class="font-semibold">
                    {{ product.stock_disponible }}
                  </span>
                </td>

                <td class="px-4 py-3">
                  <span class="inline-flex px-2.5 py-1 rounded-pill text-xs font-semibold"
                        [ngClass]="product.activo ? 'bg-emerald-500/15 text-emerald-300' : 'bg-rose-500/15 text-rose-300'">
                    {{ product.activo ? 'Activo' : 'Oculto' }}
                  </span>
                </td>

                <td class="px-4 py-3 text-right">
                  <div class="inline-flex items-center gap-1">
                    <button
                      type="button"
                      class="p-2 rounded-sm border border-border-subtle text-text-secondary hover:text-accent-primary hover:border-accent-primary/50 transition-colors cursor-pointer"
                      (click)="abrirModalEditar(product)"
                    >
                      <lucide-icon [img]="Edit3" [size]="14"></lucide-icon>
                    </button>

                    <button
                      type="button"
                      class="p-2 rounded-sm border border-border-subtle text-text-secondary hover:text-rose-300 hover:border-rose-500/40 transition-colors cursor-pointer"
                      [disabled]="deletingId() === product.id"
                      (click)="desactivarProducto(product)"
                    >
                      <lucide-icon [img]="Trash2" [size]="14"></lucide-icon>
                    </button>
                  </div>
                </td>
              </tr>

              <tr *ngIf="!loading() && productos().length === 0">
                <td colspan="7" class="px-4 py-8 text-center text-text-secondary">
                  No hay productos para los filtros actuales.
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-sm">
          <p class="text-text-secondary">Pagina {{ page() }} de {{ totalPages() || 1 }} · {{ total() }} registros</p>
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

    <div *ngIf="modalOpen()" class="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div class="absolute inset-0 bg-black/70 backdrop-blur-sm" (click)="cerrarModal()"></div>

      <section class="relative w-full max-w-2xl rounded-card border border-border-subtle bg-bg-surface p-6 md:p-7 max-h-[90vh] overflow-y-auto">
        <div class="flex items-start justify-between gap-3">
          <div>
            <p class="text-xs uppercase tracking-[0.22em] text-text-secondary">Producto</p>
            <h2 class="text-2xl font-black mt-1">{{ editMode() ? 'Editar producto' : 'Nuevo producto' }}</h2>
          </div>
          <button type="button" class="p-2 rounded-sm border border-border-subtle hover:border-accent-primary/50 cursor-pointer" (click)="cerrarModal()">
            <lucide-icon [img]="X" [size]="14"></lucide-icon>
          </button>
        </div>

        <form class="mt-6 space-y-4" [formGroup]="productForm" (ngSubmit)="guardarProducto()">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label class="space-y-1.5 text-sm">
              <span class="text-text-secondary">SKU</span>
              <input formControlName="sku" type="text" class="w-full px-3 py-2 bg-bg-main border border-border-subtle rounded-sm focus:outline-none focus:border-accent-primary" />
            </label>

            <label class="space-y-1.5 text-sm">
              <span class="text-text-secondary">Nombre</span>
              <input formControlName="nombre" type="text" class="w-full px-3 py-2 bg-bg-main border border-border-subtle rounded-sm focus:outline-none focus:border-accent-primary" />
            </label>
          </div>

          <label class="space-y-1.5 text-sm block">
            <span class="text-text-secondary">Descripcion</span>
            <textarea formControlName="descripcion" rows="3" class="w-full px-3 py-2 bg-bg-main border border-border-subtle rounded-sm focus:outline-none focus:border-accent-primary resize-none"></textarea>
          </label>

          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <label class="space-y-1.5 text-sm">
              <span class="text-text-secondary">Precio</span>
              <input formControlName="precio" type="number" min="0" step="0.01" class="w-full px-3 py-2 bg-bg-main border border-border-subtle rounded-sm focus:outline-none focus:border-accent-primary" />
            </label>

            <label class="space-y-1.5 text-sm">
              <span class="text-text-secondary">Precio oferta</span>
              <input formControlName="precio_oferta" type="number" min="0" step="0.01" class="w-full px-3 py-2 bg-bg-main border border-border-subtle rounded-sm focus:outline-none focus:border-accent-primary" />
            </label>

            <label class="space-y-1.5 text-sm">
              <span class="text-text-secondary">Stock minimo</span>
              <input formControlName="stock_minimo" type="number" min="0" class="w-full px-3 py-2 bg-bg-main border border-border-subtle rounded-sm focus:outline-none focus:border-accent-primary" />
            </label>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label class="space-y-1.5 text-sm">
              <span class="text-text-secondary">Categoria</span>
              <select formControlName="categoria_id" class="w-full px-3 py-2 bg-bg-main border border-border-subtle rounded-sm focus:outline-none focus:border-accent-primary">
                <option [ngValue]="null">Sin categoria</option>
                <option *ngFor="let categoria of categorias()" [ngValue]="categoria.id">{{ categoria.nombre }}</option>
              </select>
            </label>

            <label class="space-y-1.5 text-sm">
              <span class="text-text-secondary">Marca</span>
              <select formControlName="marca_id" class="w-full px-3 py-2 bg-bg-main border border-border-subtle rounded-sm focus:outline-none focus:border-accent-primary">
                <option [ngValue]="null">Sin marca</option>
                <option *ngFor="let marca of marcas()" [ngValue]="marca.id">{{ marca.nombre }}</option>
              </select>
            </label>
          </div>

          <label class="inline-flex items-center gap-2 text-sm cursor-pointer select-none">
            <input type="checkbox" formControlName="activo" class="accent-accent-primary" />
            <span class="text-text-secondary">Producto activo</span>
          </label>

          <div *ngIf="formError()" class="rounded-sm border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-300">
            {{ formError() }}
          </div>

          <div class="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-3">
            <app-button variant="ghost" type="button" (onClick)="cerrarModal()">Cancelar</app-button>
            <app-button variant="primary" type="submit" [disabled]="saving() || productForm.invalid">
              <span class="inline-flex items-center gap-2">
                <lucide-icon [img]="saving() ? Loader : Check" [size]="13" [ngClass]="saving() ? 'animate-spin' : ''"></lucide-icon>
                {{ saving() ? 'Guardando...' : editMode() ? 'Guardar cambios' : 'Crear producto' }}
              </span>
            </app-button>
          </div>
        </form>
      </section>
    </div>
  `,
  styles: []
})
export class AdminProductosComponent implements OnInit {
  private readonly adminService = inject(AdminService);
  private readonly fb = inject(FormBuilder);
  private readonly toast = inject(ToastService);

  readonly Search = Search;
  readonly Plus = Plus;
  readonly Boxes = Boxes;
  readonly Edit3 = Edit3;
  readonly Trash2 = Trash2;
  readonly X = X;
  readonly Check = Check;
  readonly Loader = Loader;

  readonly productos = signal<AdminProductoList[]>([]);
  readonly categorias = signal<ProductoCatalogo[]>([]);
  readonly marcas = signal<ProductoCatalogo[]>([]);

  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly deletingId = signal<number | null>(null);

  readonly total = signal(0);
  readonly page = signal(1);
  readonly pageSize = signal(10);
  readonly totalPages = signal(0);

  readonly activosCount = signal(0);
  readonly sinStockCount = signal(0);

  readonly modalOpen = signal(false);
  readonly editMode = signal(false);
  readonly editingProductId = signal<number | null>(null);
  readonly formError = signal('');

  readonly searchText = signal('');
  readonly categoriaFilter = signal<string>('');
  readonly marcaFilter = signal<string>('');

  readonly productForm = this.fb.group({
    sku: ['', [Validators.required, Validators.minLength(1)]],
    nombre: ['', [Validators.required, Validators.minLength(2)]],
    descripcion: [''],
    precio: [0, [Validators.required, Validators.min(0)]],
    precio_oferta: [null as number | null],
    stock_minimo: [0, [Validators.required, Validators.min(0)]],
    categoria_id: [null as number | null],
    marca_id: [null as number | null],
    activo: [true],
  });

  ngOnInit(): void {
    this.loadMetadata();
    this.cargarProductos();
  }

  onSearchInput(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.searchText.set(target.value);
  }

  onCategoriaChange(event: Event): void {
    const target = event.target as HTMLSelectElement;
    this.categoriaFilter.set(target.value);
  }

  onMarcaChange(event: Event): void {
    const target = event.target as HTMLSelectElement;
    this.marcaFilter.set(target.value);
  }

  aplicarFiltros(): void {
    this.page.set(1);
    this.cargarProductos();
  }

  resetFiltros(): void {
    this.searchText.set('');
    this.categoriaFilter.set('');
    this.marcaFilter.set('');
    this.page.set(1);
    this.cargarProductos();
  }

  changePage(nextPage: number): void {
    if (nextPage < 1 || (this.totalPages() > 0 && nextPage > this.totalPages())) {
      return;
    }

    this.page.set(nextPage);
    this.cargarProductos();
  }

  abrirModalCrear(): void {
    this.editMode.set(false);
    this.editingProductId.set(null);
    this.formError.set('');
    this.productForm.reset({
      sku: '',
      nombre: '',
      descripcion: '',
      precio: 0,
      precio_oferta: null,
      stock_minimo: 0,
      categoria_id: null,
      marca_id: null,
      activo: true,
    });
    this.modalOpen.set(true);
  }

  abrirModalEditar(product: AdminProductoList): void {
    this.editMode.set(true);
    this.editingProductId.set(product.id);
    this.formError.set('');

    this.adminService.getProductoDetalle(product.slug).subscribe({
      next: (detail) => {
        this.productForm.reset({
          sku: detail.sku,
          nombre: detail.nombre,
          descripcion: detail.descripcion ?? '',
          precio: detail.precio,
          precio_oferta: detail.precio_oferta ?? null,
          stock_minimo: detail.stock_minimo,
          categoria_id: detail.categoria_id ?? null,
          marca_id: detail.marca_id ?? null,
          activo: detail.activo,
        });
        this.modalOpen.set(true);
      },
      error: () => {
        this.formError.set('No se pudo cargar el detalle del producto.');
      },
    });
  }

  cerrarModal(): void {
    if (this.saving()) {
      return;
    }

    this.modalOpen.set(false);
    this.formError.set('');
  }

  guardarProducto(): void {
    if (this.productForm.invalid || this.saving()) {
      this.productForm.markAllAsTouched();
      this.toast.warning('Completa los campos requeridos del producto.');
      return;
    }

    this.saving.set(true);
    this.formError.set('');

    const payload = this.buildPayload();

    if (this.editMode()) {
      const productId = this.editingProductId();
      if (!productId) {
        this.formError.set('No se pudo identificar el producto a editar.');
        this.toast.error('No se pudo identificar el producto a editar.');
        this.saving.set(false);
        return;
      }

      this.adminService.updateProducto(productId, payload).subscribe({
        next: () => {
          this.saving.set(false);
          this.modalOpen.set(false);
          this.toast.success('Producto actualizado correctamente.');
          this.cargarProductos();
        },
        error: (error: unknown) => {
          const message = this.extractApiMessage(error, 'No se pudo actualizar el producto. Revisa los campos ingresados.');
          this.formError.set(message);
          this.toast.error(message);
          this.saving.set(false);
        },
      });
      return;
    }

    const createPayload = {
      sku: payload.sku,
      nombre: payload.nombre,
      descripcion: payload.descripcion,
      precio: payload.precio,
      precio_oferta: payload.precio_oferta,
      stock_minimo: payload.stock_minimo,
      categoria_id: payload.categoria_id,
      marca_id: payload.marca_id,
      stock_fisico: 0,
    };

    this.adminService.createProducto(createPayload).subscribe({
      next: () => {
        this.saving.set(false);
        this.modalOpen.set(false);
        this.toast.success('Producto creado correctamente.');
        this.cargarProductos();
      },
      error: (error: unknown) => {
        const message = this.extractApiMessage(error, 'No se pudo crear el producto. Revisa datos de SKU y precio.');
        this.formError.set(message);
        this.toast.error(message);
        this.saving.set(false);
      },
    });
  }

  desactivarProducto(product: AdminProductoList): void {
    if (this.deletingId()) {
      return;
    }

    this.deletingId.set(product.id);

    this.adminService.deleteProducto(product.id).subscribe({
      next: () => {
        this.deletingId.set(null);
        this.toast.success(`Producto "${product.nombre}" desactivado.`);
        this.cargarProductos();
      },
      error: (error: unknown) => {
        this.deletingId.set(null);
        this.toast.error(this.extractApiMessage(error, 'No se pudo desactivar el producto.'));
      },
    });
  }

  private cargarProductos(): void {
    this.loading.set(true);

    this.adminService.getProductos({
      page: this.page(),
      page_size: this.pageSize(),
      buscar: this.searchText().trim(),
      categoria_id: this.toNumericNullable(this.categoriaFilter()),
      marca_id: this.toNumericNullable(this.marcaFilter()),
      orden: 'recientes',
    }).subscribe({
      next: (response) => {
        this.applyPagination(response);
        this.loading.set(false);
      },
      error: () => {
        this.productos.set([]);
        this.total.set(0);
        this.totalPages.set(0);
        this.activosCount.set(0);
        this.sinStockCount.set(0);
        this.loading.set(false);
        this.toast.error('No se pudo cargar el listado de productos.');
      },
    });
  }

  private applyPagination(response: PaginatedResponse<AdminProductoList>): void {
    this.productos.set(response.items);
    this.page.set(response.page);
    this.pageSize.set(response.page_size);
    this.total.set(response.total);
    this.totalPages.set(response.total_pages);

    const list = response.items;
    this.activosCount.set(list.filter((item) => item.activo).length);
    this.sinStockCount.set(list.filter((item) => item.stock_disponible <= 0).length);
  }

  private loadMetadata(): void {
    this.adminService.getCategorias().subscribe({
      next: (response) => this.categorias.set(response.items),
      error: () => {
        this.categorias.set([]);
        this.toast.warning('No se pudieron cargar categorias.');
      },
    });

    this.adminService.getMarcas().subscribe({
      next: (response) => this.marcas.set(response.items),
      error: () => {
        this.marcas.set([]);
        this.toast.warning('No se pudieron cargar marcas.');
      },
    });
  }

  private toNumericNullable(value: string): number | null {
    if (!value) {
      return null;
    }

    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  private buildPayload() {
    const value = this.productForm.getRawValue();

    const precioOferta =
      value.precio_oferta === null || value.precio_oferta === undefined || value.precio_oferta === ('' as unknown as number)
        ? null
        : Number(value.precio_oferta);

    return {
      sku: String(value.sku ?? '').trim(),
      nombre: String(value.nombre ?? '').trim(),
      descripcion: String(value.descripcion ?? '').trim(),
      precio: Number(value.precio ?? 0),
      precio_oferta: precioOferta,
      stock_minimo: Number(value.stock_minimo ?? 0),
      categoria_id: value.categoria_id ?? null,
      marca_id: value.marca_id ?? null,
      activo: Boolean(value.activo),
    };
  }

  private extractApiMessage(error: unknown, fallback: string): string {
    if (typeof error === 'object' && error !== null && 'error' in error) {
      const apiError = (error as { error?: { detail?: string } }).error;
      if (apiError?.detail) {
        return apiError.detail;
      }
    }

    return fallback;
  }
}
