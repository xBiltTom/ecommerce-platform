import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AdminService } from '../../../core/services/admin.service';
import { LucideAngularModule, Edit2, Trash2, Eye, Plus } from 'lucide-angular';
import { ButtonComponent } from '../../../shared/components/button/button.component';

@Component({
  selector: 'app-admin-pedidos',
  standalone: true,
  imports: [CommonModule, LucideAngularModule, ButtonComponent],
  template: `
    <div class="space-y-6">
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 class="text-2xl font-bold text-text-primary">Gestión de Pedidos</h2>
          <p class="text-text-secondary mt-1">Supervisa y actualiza el estado de las órdenes.</p>
        </div>
      </div>

      <div class="bg-bg-surface border border-border-subtle rounded-card overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full text-left text-sm whitespace-nowrap">
            <thead class="bg-bg-main border-b border-border-subtle text-text-secondary">
              <tr>
                <th class="px-6 py-4 font-medium">ID Pedido</th>
                <th class="px-6 py-4 font-medium">Cliente</th>
                <th class="px-6 py-4 font-medium">Fecha</th>
                <th class="px-6 py-4 font-medium">Total</th>
                <th class="px-6 py-4 font-medium">Estado</th>
                <th class="px-6 py-4 font-medium text-right">Acciones</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-border-subtle">
              <tr *ngFor="let pedido of pedidos()" class="hover:bg-bg-surface-hover transition-colors">
                <td class="px-6 py-4 font-medium text-text-primary">#{{ pedido.id }}</td>
                <td class="px-6 py-4 text-text-secondary">{{ pedido.cliente_nombre }}</td>
                <td class="px-6 py-4 text-text-secondary">{{ pedido.fecha | date:'mediumDate' }}</td>
                <td class="px-6 py-4 font-bold text-text-primary">{{ pedido.total | currency:'PEN':'S/ ' }}</td>
                <td class="px-6 py-4">
                  <span class="px-2.5 py-1 text-xs rounded-sm font-medium" 
                        [ngClass]="getEstadoColor(pedido.estado)">
                    {{ pedido.estado | uppercase }}
                  </span>
                </td>
                <td class="px-6 py-4 text-right">
                  <div class="flex items-center justify-end gap-2">
                    <button class="p-2 text-text-secondary hover:text-text-primary transition-colors cursor-pointer rounded-sm hover:bg-border-subtle" title="Ver Detalle">
                      <lucide-icon [img]="Eye" [size]="16"></lucide-icon>
                    </button>
                    <button class="p-2 text-text-secondary hover:text-accent-primary transition-colors cursor-pointer rounded-sm hover:bg-accent-primary/10" title="Actualizar Estado">
                      <lucide-icon [img]="Edit2" [size]="16"></lucide-icon>
                    </button>
                  </div>
                </td>
              </tr>
              
              <tr *ngIf="pedidos().length === 0 && !loading()">
                <td colspan="6" class="px-6 py-12 text-center text-text-secondary">
                  No hay pedidos recientes.
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
export class AdminPedidosComponent implements OnInit {
  private adminService = inject(AdminService);
  
  readonly Edit2 = Edit2;
  readonly Trash2 = Trash2;
  readonly Eye = Eye;
  readonly Plus = Plus;

  pedidos = signal<any[]>([]);
  loading = signal(true);

  ngOnInit() {
    this.cargarPedidos();
  }

  cargarPedidos() {
    this.adminService.getPedidos().subscribe({
      next: (data) => {
        this.pedidos.set(data.items || data);
        this.loading.set(false);
      },
      error: () => {
        // Mock fallback para la UI
        this.pedidos.set([
          { id: '1024', cliente_nombre: 'Juan Perez', fecha: new Date(), total: 450.00, estado: 'pendiente' },
          { id: '1023', cliente_nombre: 'Maria Gomez', fecha: new Date(Date.now() - 86400000), total: 1200.50, estado: 'enviado' },
          { id: '1022', cliente_nombre: 'Carlos Ruiz', fecha: new Date(Date.now() - 172800000), total: 89.90, estado: 'entregado' },
          { id: '1021', cliente_nombre: 'Ana Torres', fecha: new Date(Date.now() - 259200000), total: 320.00, estado: 'cancelado' }
        ]);
        this.loading.set(false);
      }
    });
  }

  getEstadoColor(estado: string): string {
    switch (estado.toLowerCase()) {
      case 'pendiente': return 'bg-yellow-500/10 text-yellow-400';
      case 'enviado': return 'bg-blue-500/10 text-blue-400';
      case 'entregado': return 'bg-green-500/10 text-green-400';
      case 'cancelado': return 'bg-red-500/10 text-red-400';
      default: return 'bg-border-subtle text-text-secondary';
    }
  }
}
