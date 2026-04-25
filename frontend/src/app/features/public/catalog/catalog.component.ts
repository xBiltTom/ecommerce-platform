import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule, SlidersHorizontal, ChevronDown, Search } from 'lucide-angular';
import { ProductCardComponent, ProductData } from '../../../shared/components/product-card/product-card.component';
import { ButtonComponent } from '../../../shared/components/button/button.component';
import { ProductService, Categoria, Marca } from '../../../core/services/product.service';
import { CartService } from '../../../core/services/cart.service';

@Component({
  selector: 'app-catalog',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule, ProductCardComponent, ButtonComponent],
  template: `
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      
      <!-- Hero / Header de Catálogo -->
      <div class="mb-12 border-b border-border-subtle pb-8 flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 class="text-4xl font-bold text-text-primary tracking-tight mb-2">Nuevos Arribos</h1>
          <p class="text-text-secondary max-w-2xl">Descubre la última tecnología de vanguardia, diseñada para el máximo rendimiento y un estilo impecable.</p>
        </div>
        
        <div class="flex items-center gap-4">
          <div class="relative">
            <select class="appearance-none bg-bg-surface border border-border-subtle rounded-pill py-2 pl-4 pr-10 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-accent-primary cursor-pointer">
              <option>Recomendados</option>
              <option>Precio: Menor a Mayor</option>
              <option>Precio: Mayor a Menor</option>
              <option>Más recientes</option>
            </select>
            <lucide-icon [img]="ChevronDown" [size]="16" class="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary pointer-events-none"></lucide-icon>
          </div>
          
          <button class="md:hidden p-2 bg-bg-surface border border-border-subtle rounded-pill text-text-primary" aria-label="Filtros">
            <lucide-icon [img]="SlidersHorizontal" [size]="20"></lucide-icon>
          </button>
        </div>
      </div>

      <div class="flex flex-col md:flex-row gap-10">
        <!-- Sidebar Filters -->
        <aside class="hidden md:block w-64 flex-shrink-0 space-y-10">
          
          <!-- Categorías -->
          <div>
            <h3 class="text-sm font-bold text-text-primary uppercase tracking-wider mb-4">Categorías</h3>
            <ul class="space-y-3">
              <li *ngFor="let cat of categorias()" class="flex items-center justify-between group cursor-pointer">
                <span class="text-text-secondary group-hover:text-accent-primary transition-colors">{{ cat.nombre }}</span>
              </li>
            </ul>
          </div>

          <!-- Marcas -->
          <div>
            <h3 class="text-sm font-bold text-text-primary uppercase tracking-wider mb-4">Marcas</h3>
            <div class="space-y-3">
              <label *ngFor="let marca of marcas()" class="flex items-center gap-3 cursor-pointer group">
                <div class="relative flex items-center justify-center w-5 h-5 rounded-sm border border-border-subtle bg-bg-main group-hover:border-accent-primary transition-colors">
                  <!-- Custom checkbox state logic can be added here -->
                </div>
                <span class="text-text-secondary group-hover:text-text-primary transition-colors">{{ marca.nombre }}</span>
              </label>
            </div>
          </div>

          <!-- Precio -->
          <div>
            <h3 class="text-sm font-bold text-text-primary uppercase tracking-wider mb-4">Rango de Precio</h3>
            <div class="flex items-center gap-2">
              <input type="text" placeholder="Min" class="w-full bg-bg-surface border border-border-subtle rounded-sm px-3 py-1.5 text-sm text-text-primary focus:outline-none focus:border-accent-primary">
              <span class="text-text-secondary">-</span>
              <input type="text" placeholder="Máx" class="w-full bg-bg-surface border border-border-subtle rounded-sm px-3 py-1.5 text-sm text-text-primary focus:outline-none focus:border-accent-primary">
            </div>
          </div>

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
            <app-button variant="secondary" class="mt-6">Limpiar Filtros</app-button>
          </div>
          
          <!-- Pagination -->
          <div *ngIf="!loading() && productos().length > 0" class="mt-16 flex items-center justify-center gap-2">
             <button class="w-10 h-10 flex items-center justify-center rounded-sm border border-border-subtle text-text-secondary hover:bg-bg-surface hover:text-text-primary disabled:opacity-50" aria-label="Anterior">1</button>
             <button class="w-10 h-10 flex items-center justify-center rounded-sm bg-accent-primary text-text-inverse font-bold" aria-label="Página actual">2</button>
             <button class="w-10 h-10 flex items-center justify-center rounded-sm border border-border-subtle text-text-secondary hover:bg-bg-surface hover:text-text-primary" aria-label="Siguiente">3</button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: []
})
export class CatalogComponent implements OnInit {
  private productService = inject(ProductService);
  private cartService = inject(CartService);

  productos = signal<ProductData[]>([]);
  categorias = signal<Categoria[]>([]);
  marcas = signal<Marca[]>([]);
  loading = signal<boolean>(true);

  readonly ChevronDown = ChevronDown;
  readonly SlidersHorizontal = SlidersHorizontal;
  readonly Search = Search;

  ngOnInit() {
    this.loadData();
  }

  loadData() {
    this.loading.set(true);
    
    this.productService.getCategorias().subscribe(res => this.categorias.set(res.items));
    this.productService.getMarcas().subscribe(res => this.marcas.set(res.items));
    
    this.productService.getProductos().subscribe(res => {
      // Small timeout to simulate network request and show skeletons
      setTimeout(() => {
        this.productos.set(res.items);
        this.loading.set(false);
      }, 600);
    });
  }

  addToCart(product: ProductData) {
    this.cartService.addToCart(product, 1);
    // Podríamos añadir un toast global aquí en el futuro
  }
}
