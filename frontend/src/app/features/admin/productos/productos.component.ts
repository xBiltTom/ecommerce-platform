import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule, Edit2, Trash2, Plus, Image } from 'lucide-angular';
import { ButtonComponent } from '../../../shared/components/button/button.component';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-admin-productos',
  standalone: true,
  imports: [CommonModule, LucideAngularModule, ButtonComponent],
  template: `
    <div class="space-y-6">
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 class="text-2xl font-bold text-text-primary">Catálogo de Productos</h2>
          <p class="text-text-secondary mt-1">Administra el inventario, precios y detalles.</p>
        </div>
        <app-button variant="primary">
          <span class="flex items-center gap-2">
            <lucide-icon [img]="Plus" [size]="16"></lucide-icon>
            Nuevo Producto
          </span>
        </app-button>
      </div>

      <div class="bg-bg-surface border border-border-subtle rounded-card overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full text-left text-sm whitespace-nowrap">
            <thead class="bg-bg-main border-b border-border-subtle text-text-secondary">
              <tr>
                <th class="px-6 py-4 font-medium w-16">Imagen</th>
                <th class="px-6 py-4 font-medium">Detalle del Producto</th>
                <th class="px-6 py-4 font-medium">Precio</th>
                <th class="px-6 py-4 font-medium">Stock</th>
                <th class="px-6 py-4 font-medium">Estado</th>
                <th class="px-6 py-4 font-medium text-right">Acciones</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-border-subtle">
              <tr *ngFor="let prod of productos()" class="hover:bg-bg-surface-hover transition-colors">
                <td class="px-6 py-4">
                  <div class="w-12 h-12 bg-white rounded-sm border border-border-subtle p-1">
                    <img *ngIf="prod.imagen_url" [src]="prod.imagen_url" class="w-full h-full object-contain">
                    <div *ngIf="!prod.imagen_url" class="w-full h-full flex items-center justify-center text-border-subtle">
                      <lucide-icon [img]="Image" [size]="20"></lucide-icon>
                    </div>
                  </div>
                </td>
                <td class="px-6 py-4">
                  <p class="font-bold text-text-primary">{{ prod.nombre }}</p>
                  <p class="text-xs text-text-secondary mt-0.5">SKU: {{ prod.sku }} | Categoría: {{ prod.categoria_nombre }}</p>
                </td>
                <td class="px-6 py-4">
                  <div class="flex flex-col">
                    <span class="font-bold text-text-primary">{{ (prod.precio_oferta || prod.precio) | currency:'PEN':'S/ ' }}</span>
                    <span *ngIf="prod.precio_oferta" class="text-xs text-text-secondary line-through">{{ prod.precio | currency:'PEN':'S/ ' }}</span>
                  </div>
                </td>
                <td class="px-6 py-4">
                  <span class="font-medium" [ngClass]="prod.stock_disponible > 10 ? 'text-green-400' : 'text-red-400'">
                    {{ prod.stock_disponible }} unid.
                  </span>
                </td>
                <td class="px-6 py-4">
                  <span class="px-2.5 py-1 text-xs rounded-sm font-medium" 
                        [ngClass]="prod.activo ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'">
                    {{ prod.activo ? 'Publicado' : 'Oculto' }}
                  </span>
                </td>
                <td class="px-6 py-4 text-right">
                  <div class="flex items-center justify-end gap-2">
                    <button class="p-2 text-text-secondary hover:text-accent-primary transition-colors cursor-pointer rounded-sm hover:bg-accent-primary/10">
                      <lucide-icon [img]="Edit2" [size]="16"></lucide-icon>
                    </button>
                    <button class="p-2 text-text-secondary hover:text-red-400 transition-colors cursor-pointer rounded-sm hover:bg-red-500/10">
                      <lucide-icon [img]="Trash2" [size]="16"></lucide-icon>
                    </button>
                  </div>
                </td>
              </tr>
              
              <tr *ngIf="productos().length === 0 && !loading()">
                <td colspan="6" class="px-6 py-12 text-center text-text-secondary">
                  No hay productos en el catálogo.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `,
  styles: []
})
export class AdminProductosComponent implements OnInit {
  private http = inject(HttpClient);
  
  readonly Edit2 = Edit2;
  readonly Trash2 = Trash2;
  readonly Plus = Plus;
  readonly Image = Image;

  productos = signal<any[]>([]);
  loading = signal(true);

  ngOnInit() {
    this.cargarProductos();
  }

  cargarProductos() {
    this.http.get<any>('http://localhost:8000/api/v1/productos?page_size=10').subscribe({
      next: (data) => {
        this.productos.set(data.items);
        this.loading.set(false);
      },
      error: () => {
        // Fallback
        this.loading.set(false);
      }
    });
  }
}
