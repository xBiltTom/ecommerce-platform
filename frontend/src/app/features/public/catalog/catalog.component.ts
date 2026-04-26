import { Component, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, ParamMap, Params, Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { LucideAngularModule, SlidersHorizontal, ChevronDown, Search, X, Check, ChevronLeft, ChevronRight } from 'lucide-angular';
import { ProductCardComponent, ProductData } from '../../../shared/components/product-card/product-card.component';
import { ButtonComponent } from '../../../shared/components/button/button.component';
import { ProductService, Categoria, GetProductosParams, Marca, ProductoOrden } from '../../../core/services/product.service';
import { CartService } from '../../../core/services/cart.service';
import { ToastService } from '../../../core/services/toast.service';
import {
  CATALOG_SORT_OPTIONS,
  CatalogFilters,
  DEFAULT_CATALOG_FILTERS,
  DEFAULT_CATALOG_PAGE_SIZE,
  MAX_CATALOG_PRICE,
  MIN_CATALOG_PRICE,
} from '../../../core/models/catalog.model';

@Component({
  selector: 'app-catalog',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule, ProductCardComponent, ButtonComponent],
  template: `
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <!-- Hero / Header de Catálogo -->
      <div class="mb-10 border-b border-border-subtle pb-8 flex flex-col lg:flex-row lg:items-end justify-between gap-6">
        <div class="max-w-2xl">
          <h1 class="text-4xl font-bold text-text-primary tracking-tight mb-2">Nuevos Arribos</h1>
          <p class="text-text-secondary max-w-2xl">Descubre la última tecnología de vanguardia, diseñada para el máximo rendimiento y un estilo impecable.</p>
        </div>

        <div class="w-full lg:w-auto flex flex-col sm:flex-row gap-3 sm:items-center">
          <div class="relative w-full sm:w-64">
            <lucide-icon [img]="Search" [size]="16" class="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary"></lucide-icon>
            <input
              type="search"
              placeholder="Buscar producto..."
              class="w-full bg-bg-surface border border-border-subtle rounded-pill py-2 pl-10 pr-4 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-accent-primary"
              [ngModel]="searchInput()"
              (ngModelChange)="searchInput.set($event)"
              (keyup.enter)="applySearch()"
            >
          </div>

          <div class="relative w-full sm:w-auto">
            <select
              class="w-full appearance-none bg-bg-surface border border-border-subtle rounded-pill py-2 pl-4 pr-10 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-accent-primary cursor-pointer"
              [ngModel]="filters().orden"
              (ngModelChange)="updateSort($event)"
            >
              <option *ngFor="let option of sortOptions" [ngValue]="option.value">{{ option.label }}</option>
            </select>
            <lucide-icon [img]="ChevronDown" [size]="16" class="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary pointer-events-none"></lucide-icon>
          </div>

          <app-button variant="secondary" size="sm" (onClick)="applySearch()">Buscar</app-button>

          <button
            class="md:hidden p-2 bg-bg-surface border border-border-subtle rounded-pill text-text-primary"
            aria-label="Filtros"
            (click)="isMobileFiltersOpen.update((v) => !v)"
          >
            <lucide-icon [img]="SlidersHorizontal" [size]="20"></lucide-icon>
          </button>
        </div>
      </div>

      <div class="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-sm">
        <p class="text-text-secondary">
          {{ total() }} producto{{ total() === 1 ? '' : 's' }} encontrado{{ total() === 1 ? '' : 's' }}
        </p>
        <button
          *ngIf="hasActiveFilters()"
          class="inline-flex items-center gap-2 text-text-secondary hover:text-text-primary transition-colors"
          (click)="clearFilters()"
          type="button"
        >
          <lucide-icon [img]="X" [size]="14"></lucide-icon>
          Limpiar filtros
        </button>
      </div>

      <ng-template #filtersTemplate>
        <div class="space-y-10">
          <div>
            <h3 class="text-sm font-bold text-text-primary uppercase tracking-wider mb-4">Categorías</h3>
            <div class="space-y-2">
              <button
                type="button"
                class="w-full text-left text-sm px-3 py-2 rounded-sm transition-colors"
                [ngClass]="filters().categoriaId === null ? 'bg-accent-primary text-text-inverse font-semibold' : 'text-text-secondary hover:text-text-primary hover:bg-bg-surface'"
                (click)="selectCategory(null)"
              >
                Todas las categorías
              </button>
              <button
                *ngFor="let cat of categorias(); trackBy: trackById"
                type="button"
                class="w-full text-left text-sm px-3 py-2 rounded-sm transition-colors"
                [ngClass]="isCategorySelected(cat.id) ? 'bg-accent-primary text-text-inverse font-semibold' : 'text-text-secondary hover:text-text-primary hover:bg-bg-surface'"
                (click)="selectCategory(cat.id)"
              >
                {{ cat.nombre }}
              </button>
            </div>
          </div>

          <div>
            <h3 class="text-sm font-bold text-text-primary uppercase tracking-wider mb-4">Marcas</h3>
            <div class="space-y-3">
              <button
                *ngFor="let marca of marcas(); trackBy: trackById"
                type="button"
                class="w-full flex items-center gap-3 text-left"
                (click)="toggleBrand(marca.id)"
              >
                <span
                  class="flex items-center justify-center w-5 h-5 rounded-sm border transition-colors"
                  [ngClass]="isBrandSelected(marca.id) ? 'border-accent-primary bg-accent-primary text-text-inverse' : 'border-border-subtle bg-bg-main text-transparent'"
                >
                  <lucide-icon [img]="Check" [size]="13"></lucide-icon>
                </span>
                <span [ngClass]="isBrandSelected(marca.id) ? 'text-text-primary font-medium' : 'text-text-secondary'">
                  {{ marca.nombre }}
                </span>
              </button>

              <button
                *ngIf="filters().marcaId !== null"
                type="button"
                class="text-xs text-text-secondary hover:text-text-primary"
                (click)="clearBrandSelection()"
              >
                Quitar marca seleccionada
              </button>
            </div>
          </div>

          <div>
            <h3 class="text-sm font-bold text-text-primary uppercase tracking-wider mb-4">Rango de Precio</h3>
            <div class="flex items-center gap-2 mb-3">
              <input
                type="number"
                min="0"
                step="1"
                placeholder="Min"
                class="w-full bg-bg-surface border border-border-subtle rounded-sm px-3 py-1.5 text-sm text-text-primary focus:outline-none focus:border-accent-primary"
                [ngModel]="priceMinInput()"
                (ngModelChange)="priceMinInput.set($event)"
                (keyup.enter)="applyPriceFilter()"
              >
              <span class="text-text-secondary">-</span>
              <input
                type="number"
                min="0"
                step="1"
                placeholder="Máx"
                class="w-full bg-bg-surface border border-border-subtle rounded-sm px-3 py-1.5 text-sm text-text-primary focus:outline-none focus:border-accent-primary"
                [ngModel]="priceMaxInput()"
                (ngModelChange)="priceMaxInput.set($event)"
                (keyup.enter)="applyPriceFilter()"
              >
            </div>

            <div class="flex items-center gap-2">
              <app-button variant="secondary" size="sm" (onClick)="applyPriceFilter()">Aplicar</app-button>
              <app-button
                variant="ghost"
                size="sm"
                (onClick)="clearPriceFilter()"
                [disabled]="filters().precioMin === null && filters().precioMax === null"
              >
                Limpiar
              </app-button>
            </div>
          </div>
        </div>
      </ng-template>

      <div *ngIf="isMobileFiltersOpen()" class="md:hidden mb-8 border border-border-subtle rounded-card p-5 bg-bg-surface relative">
        <button
          class="absolute top-4 right-4 text-text-secondary hover:text-text-primary"
          type="button"
          (click)="isMobileFiltersOpen.set(false)"
          aria-label="Cerrar filtros"
        >
          <lucide-icon [img]="X" [size]="18"></lucide-icon>
        </button>
        <h2 class="text-base font-bold text-text-primary mb-5">Filtros</h2>
        <ng-container [ngTemplateOutlet]="filtersTemplate"></ng-container>
      </div>

      <div class="flex flex-col md:flex-row gap-10">
        <!-- Sidebar Filters -->
        <aside class="hidden md:block w-72 flex-shrink-0">
          <ng-container [ngTemplateOutlet]="filtersTemplate"></ng-container>
        </aside>

        <!-- Product Grid -->
        <div class="flex-grow">
          <div *ngIf="loading()" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
             <!-- Skeletons -->
             <div *ngFor="let i of [1,2,3,4,5,6]" class="aspect-square bg-bg-surface animate-pulse rounded-card border border-border-subtle"></div>
          </div>

          <div *ngIf="!loading() && productos().length > 0" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            <app-product-card
              *ngFor="let product of productos()"
              [product]="product"
              [requiresWhiteBg]="product.categoria_nombre === 'Wearables' || product.categoria_nombre === 'Audio'"
              (onAddToCart)="addToCart($event)"
            >
            </app-product-card>
          </div>

          <div *ngIf="!loading() && productos().length === 0" class="flex flex-col items-center justify-center py-20 text-center">
            <div class="w-16 h-16 mb-4 rounded-full bg-bg-surface flex items-center justify-center text-text-secondary">
               <lucide-icon [img]="Search" [size]="24"></lucide-icon>
            </div>
            <h3 class="text-xl font-bold text-text-primary mb-2">No se encontraron productos</h3>
            <p class="text-text-secondary">Intenta ajustar tus filtros o criterios de búsqueda.</p>
            <app-button variant="secondary" class="mt-6" (onClick)="clearFilters()">Limpiar Filtros</app-button>
          </div>

          <!-- Pagination -->
          <div *ngIf="!loading() && productos().length > 0 && totalPages() > 1" class="mt-16 flex items-center justify-center gap-2 flex-wrap">
            <button
              class="w-10 h-10 flex items-center justify-center rounded-sm border border-border-subtle text-text-secondary hover:bg-bg-surface hover:text-text-primary disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label="Anterior"
              type="button"
              (click)="goToPreviousPage()"
              [disabled]="filters().page <= 1"
            >
              <lucide-icon [img]="ChevronLeft" [size]="16"></lucide-icon>
            </button>

            <button
              *ngFor="let page of visiblePages(); trackBy: trackByPage"
              class="w-10 h-10 flex items-center justify-center rounded-sm border text-sm"
              [ngClass]="page === filters().page ? 'bg-accent-primary border-accent-primary text-text-inverse font-bold' : 'border-border-subtle text-text-secondary hover:bg-bg-surface hover:text-text-primary'"
              type="button"
              (click)="goToPage(page)"
              [attr.aria-label]="'Ir a página ' + page"
            >
              {{ page }}
            </button>

            <button
              class="w-10 h-10 flex items-center justify-center rounded-sm border border-border-subtle text-text-secondary hover:bg-bg-surface hover:text-text-primary disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label="Siguiente"
              type="button"
              (click)="goToNextPage()"
              [disabled]="filters().page >= totalPages()"
            >
              <lucide-icon [img]="ChevronRight" [size]="16"></lucide-icon>
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: []
})
export class CatalogComponent implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private productService = inject(ProductService);
  private cartService = inject(CartService);
  private toast = inject(ToastService);
  private destroy$ = new Subject<void>();
  private latestRequestId = 0;

  productos = signal<ProductData[]>([]);
  categorias = signal<Categoria[]>([]);
  marcas = signal<Marca[]>([]);
  loading = signal<boolean>(true);
  filters = signal<CatalogFilters>({ ...DEFAULT_CATALOG_FILTERS });
  searchInput = signal<string>('');
  priceMinInput = signal<number | null>(null);
  priceMaxInput = signal<number | null>(null);
  total = signal<number>(0);
  totalPages = signal<number>(0);
  isMobileFiltersOpen = signal<boolean>(false);

  readonly sortOptions = CATALOG_SORT_OPTIONS;

  readonly ChevronDown = ChevronDown;
  readonly SlidersHorizontal = SlidersHorizontal;
  readonly Search = Search;
  readonly X = X;
  readonly Check = Check;
  readonly ChevronLeft = ChevronLeft;
  readonly ChevronRight = ChevronRight;

  ngOnInit() {
    this.loadData();
    this.listenToQueryParams();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadData() {
    this.productService
      .getCategorias()
      .pipe(takeUntil(this.destroy$))
      .subscribe((res) => this.categorias.set(res.items));

    this.productService
      .getMarcas()
      .pipe(takeUntil(this.destroy$))
      .subscribe((res) => this.marcas.set(res.items));
  }

  private listenToQueryParams() {
    this.route.queryParamMap.pipe(takeUntil(this.destroy$)).subscribe((params) => {
      const parsedFilters = this.parseFilters(params);

      this.filters.set(parsedFilters);
      this.searchInput.set(parsedFilters.buscar);
      this.priceMinInput.set(parsedFilters.precioMin);
      this.priceMaxInput.set(parsedFilters.precioMax);

      this.fetchProducts(parsedFilters);
    });
  }

  addToCart(product: ProductData) {
    this.cartService.addToCart(product, 1);
  }

  updateSort(orden: ProductoOrden) {
    this.updateFilters({ orden }, true);
  }

  applySearch() {
    this.updateFilters({ buscar: this.searchInput().trim() }, true);
  }

  selectCategory(categoryId: number | null) {
    this.updateFilters({ categoriaId: categoryId }, true);
  }

  toggleBrand(brandId: number) {
    const currentBrand = this.filters().marcaId;
    this.updateFilters({ marcaId: currentBrand === brandId ? null : brandId }, true);
  }

  clearBrandSelection() {
    this.updateFilters({ marcaId: null }, true);
  }

  applyPriceFilter() {
    const parsedMin = this.parsePriceInput(this.priceMinInput());
    const parsedMax = this.parsePriceInput(this.priceMaxInput());

    if (parsedMin !== null && parsedMin < MIN_CATALOG_PRICE) {
      this.toast.warning('El precio mínimo no puede ser negativo.', 'Filtros');
      return;
    }

    if (parsedMax !== null && parsedMax > MAX_CATALOG_PRICE) {
      this.toast.warning(`El precio máximo permitido es S/ ${MAX_CATALOG_PRICE}.`, 'Filtros');
      return;
    }

    if (parsedMin !== null && parsedMax !== null && parsedMin > parsedMax) {
      this.toast.warning('El precio mínimo no puede ser mayor al máximo.', 'Filtros');
      return;
    }

    this.updateFilters({ precioMin: parsedMin, precioMax: parsedMax }, true);
  }

  clearPriceFilter() {
    this.priceMinInput.set(null);
    this.priceMaxInput.set(null);
    this.updateFilters({ precioMin: null, precioMax: null }, true);
  }

  clearFilters() {
    this.searchInput.set('');
    this.priceMinInput.set(null);
    this.priceMaxInput.set(null);
    this.navigateWithFilters({
      ...DEFAULT_CATALOG_FILTERS,
      pageSize: DEFAULT_CATALOG_PAGE_SIZE,
    });
  }

  goToPage(page: number) {
    if (page < 1 || page > this.totalPages() || page === this.filters().page) {
      return;
    }

    this.updateFilters({ page }, false);
  }

  goToPreviousPage() {
    this.goToPage(this.filters().page - 1);
  }

  goToNextPage() {
    this.goToPage(this.filters().page + 1);
  }

  visiblePages(): number[] {
    const totalPages = this.totalPages();
    const currentPage = this.filters().page;

    if (totalPages <= 1) {
      return [];
    }

    const windowSize = 2;
    const start = Math.max(1, currentPage - windowSize);
    const end = Math.min(totalPages, currentPage + windowSize);
    const pages: number[] = [];

    for (let page = start; page <= end; page++) {
      pages.push(page);
    }

    return pages;
  }

  hasActiveFilters(): boolean {
    const state = this.filters();
    return (
      state.categoriaId !== null ||
      state.marcaId !== null ||
      state.precioMin !== null ||
      state.precioMax !== null ||
      !!state.buscar ||
      state.orden !== DEFAULT_CATALOG_FILTERS.orden
    );
  }

  isCategorySelected(categoryId: number): boolean {
    return this.filters().categoriaId === categoryId;
  }

  isBrandSelected(brandId: number): boolean {
    return this.filters().marcaId === brandId;
  }

  trackById(index: number, item: { id: number }) {
    return item.id;
  }

  trackByPage(index: number, page: number) {
    return page;
  }

  private fetchProducts(filters: CatalogFilters) {
    this.loading.set(true);
    const requestId = ++this.latestRequestId;

    this.productService
      .getProductos(this.buildProductQueryParams(filters))
      .pipe(takeUntil(this.destroy$))
      .subscribe((res) => {
        if (requestId !== this.latestRequestId) {
          return;
        }

        if (res.total_pages > 0 && filters.page > res.total_pages) {
          this.navigateWithFilters({ ...filters, page: res.total_pages }, true);
          return;
        }

        this.productos.set(res.items);
        this.total.set(res.total);
        this.totalPages.set(res.total_pages);
        this.loading.set(false);
      });
  }

  private buildProductQueryParams(filters: CatalogFilters): GetProductosParams {
    return {
      page: filters.page,
      page_size: filters.pageSize,
      categoria_id: filters.categoriaId,
      marca_id: filters.marcaId,
      precio_min: filters.precioMin,
      precio_max: filters.precioMax,
      buscar: filters.buscar,
      orden: filters.orden,
    };
  }

  private parseFilters(queryParams: ParamMap): CatalogFilters {
    const page = this.parsePositiveInt(queryParams.get('page')) ?? DEFAULT_CATALOG_FILTERS.page;
    const pageSize = this.parsePositiveInt(queryParams.get('page_size')) ?? DEFAULT_CATALOG_FILTERS.pageSize;
    const categoriaId = this.parsePositiveInt(queryParams.get('categoria_id'));
    const marcaId = this.parsePositiveInt(queryParams.get('marca_id'));
    const precioMin = this.parsePriceInput(queryParams.get('precio_min'));
    const precioMax = this.parsePriceInput(queryParams.get('precio_max'));
    const buscar = (queryParams.get('buscar') ?? '').trim();
    const orden = this.parseOrder(queryParams.get('orden'));

    return {
      page,
      pageSize,
      categoriaId,
      marcaId,
      precioMin,
      precioMax,
      buscar,
      orden,
    };
  }

  private parseOrder(rawValue: string | null): ProductoOrden {
    const value = (rawValue ?? '').trim() as ProductoOrden;
    const isAllowed = this.sortOptions.some((item) => item.value === value);
    return isAllowed ? value : DEFAULT_CATALOG_FILTERS.orden;
  }

  private parsePositiveInt(rawValue: string | null): number | null {
    if (!rawValue) {
      return null;
    }

    const parsed = Number(rawValue);
    if (!Number.isFinite(parsed) || parsed < 1) {
      return null;
    }

    return Math.floor(parsed);
  }

  private parsePriceInput(rawValue: string | number | null | undefined): number | null {
    if (rawValue === null || rawValue === undefined || rawValue === '') {
      return null;
    }

    const normalized =
      typeof rawValue === 'string'
        ? rawValue.trim().replace(',', '.')
        : rawValue;

    if (normalized === '') {
      return null;
    }

    const parsed = Number(normalized);
    if (!Number.isFinite(parsed) || parsed < 0) {
      return null;
    }

    return Number(parsed.toFixed(2));
  }

  private updateFilters(patch: Partial<CatalogFilters>, resetPage: boolean) {
    const current = this.filters();
    const nextFilters: CatalogFilters = {
      ...current,
      ...patch,
      page: resetPage ? 1 : patch.page ?? current.page,
    };

    this.navigateWithFilters(nextFilters);
  }

  private navigateWithFilters(filters: CatalogFilters, replaceUrl = false) {
    const queryParams: Params = {
      page: filters.page !== DEFAULT_CATALOG_FILTERS.page ? filters.page : null,
      page_size: filters.pageSize !== DEFAULT_CATALOG_FILTERS.pageSize ? filters.pageSize : null,
      categoria_id: filters.categoriaId,
      marca_id: filters.marcaId,
      precio_min: filters.precioMin,
      precio_max: filters.precioMax,
      buscar: filters.buscar || null,
      orden: filters.orden !== DEFAULT_CATALOG_FILTERS.orden ? filters.orden : null,
    };

    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams,
      replaceUrl,
    });
  }
}
