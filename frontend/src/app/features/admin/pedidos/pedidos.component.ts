import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  AdminPedido,
  AdminPedidoDetalle,
  AdminPedidoDetalleItem,
  AdminService,
  EstadoPedido,
  PaginatedResponse,
} from '../../../core/services/admin.service';
import { ToastService } from '../../../core/services/toast.service';
import {
  ChevronDown,
  Loader,
  LucideAngularModule,
  PackageCheck,
  Search,
  Send,
  Eye,
  X
} from 'lucide-angular';
import { ButtonComponent } from '../../../shared/components/button/button.component';


interface EstadoOption {
  label: string;
  value: EstadoPedido;
}

interface AdminPedidoDetalleItemView extends AdminPedidoDetalleItem {
  igv_unitario: number;
  igv_total: number;
  subtotal_sin_igv: number;
  subtotal_con_igv: number;
}

interface AdminPedidoDetalleView extends AdminPedidoDetalle {
  items: AdminPedidoDetalleItemView[];
  igv_total: number;
  subtotal_sin_igv: number;
  subtotal_con_igv: number;
  total_con_igv: number;
}

@Component({
  selector: 'app-admin-pedidos',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule, ButtonComponent],
  template: `
    <div class="max-w-7xl mx-auto space-y-6">
      <section class="rounded-card border border-border-subtle bg-bg-surface/90 p-6 md:p-7">
        <div class="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <p class="text-xs uppercase tracking-[0.25em] text-text-secondary">Orquestacion</p>
            <h1 class="text-3xl font-black tracking-tight mt-1">Pedidos</h1>
            <p class="text-text-secondary mt-2 max-w-2xl">
              Monitorea la cola operativa y actualiza estados para mantener trazabilidad de entrega.
            </p>
          </div>

          <div class="grid grid-cols-2 sm:grid-cols-3 gap-3 min-w-[260px]">
            <div class="rounded-sm border border-border-subtle bg-bg-main/60 px-3 py-2">
              <p class="text-xs uppercase tracking-[0.18em] text-text-secondary">Registros</p>
              <p class="text-xl font-black mt-1">{{ total() }}</p>
            </div>
            <div class="rounded-sm border border-border-subtle bg-bg-main/60 px-3 py-2">
              <p class="text-xs uppercase tracking-[0.18em] text-text-secondary">Pagina</p>
              <p class="text-xl font-black mt-1">{{ page() }}/{{ totalPages() || 1 }}</p>
            </div>
            <div class="rounded-sm border border-border-subtle bg-bg-main/60 px-3 py-2">
              <p class="text-xs uppercase tracking-[0.18em] text-text-secondary">Actualizando</p>
              <p class="text-xl font-black mt-1 text-accent-primary">{{ updatingId() ? '1' : '0' }}</p>
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
              placeholder="Filtrar por ID de pedido"
              [(ngModel)]="searchText"
              (keyup.enter)="aplicarFiltros()"
            />
          </div>

          <div class="flex flex-wrap items-center gap-2">
            <select
              class="bg-bg-main border border-border-subtle rounded-sm px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent-primary"
              [(ngModel)]="estadoFilter"
              (change)="aplicarFiltros()"
            >
              <option value="">Todos los estados</option>
              <option *ngFor="let option of estadoOptions" [value]="option.value">{{ option.label }}</option>
            </select>

            <app-button variant="secondary" size="sm" (onClick)="aplicarFiltros()">Filtrar</app-button>
            <app-button variant="ghost" size="sm" (onClick)="limpiarFiltros()">Limpiar</app-button>
          </div>
        </div>

        <div class="overflow-x-auto border border-border-subtle rounded-card">
          <table class="w-full text-left text-sm min-w-[980px]">
            <thead class="bg-bg-main border-b border-border-subtle text-text-secondary uppercase tracking-[0.12em] text-[11px]">
              <tr>
                <th class="px-4 py-3">Pedido</th>
                <th class="px-4 py-3">Fecha</th>
                <th class="px-4 py-3">Items</th>
                <th class="px-4 py-3">Total</th>
                <th class="px-4 py-3">Estado actual</th>
                <th class="px-4 py-3">Cambiar estado</th>
                <th class="px-4 py-3 text-right">Accion</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-border-subtle">
              <tr *ngIf="loading()">
                <td colspan="7" class="px-4 py-8 text-center text-text-secondary">Cargando pedidos...</td>
              </tr>

              <tr *ngFor="let pedido of filteredPedidos()" class="hover:bg-bg-main/70 transition-colors">
                <td class="px-4 py-3">
                  <div>
                    <p class="font-semibold text-text-primary">#{{ shortId(pedido.id) }}</p>
                    <p class="text-xs text-text-secondary">ID completo: {{ pedido.id }}</p>
                  </div>
                </td>
                <td class="px-4 py-3 text-text-secondary">{{ toDate(pedido.fecha_creacion) }}</td>
                <td class="px-4 py-3">{{ pedido.total_items }}</td>
                <td class="px-4 py-3 font-semibold">{{ pedido.total | currency:'PEN':'S/ ' }}</td>
                <td class="px-4 py-3">
                  <span class="inline-flex px-2.5 py-1 rounded-pill text-xs font-semibold"
                        [ngClass]="estadoBadge(pedido.estado)">
                    {{ humanEstado(pedido.estado) }}
                  </span>
                </td>

                <td class="px-4 py-3">
                  <div class="flex items-center gap-2">
                    <select
                      class="bg-bg-main border border-border-subtle rounded-sm px-2.5 py-1.5 text-xs focus:outline-none focus:border-accent-primary"
                      [ngModel]="nextEstadoFor(pedido.id)"
                      (ngModelChange)="setNextEstado(pedido.id, $event)"
                    >
                      <option *ngFor="let option of estadoOptions" [value]="option.value">
                        {{ option.label }}
                      </option>
                    </select>
                  </div>
                </td>

                <td class="px-4 py-3 text-right">
                  <div class="flex items-center justify-end gap-2">
                    <button
                      type="button"
                      class="inline-flex items-center justify-center p-1.5 rounded-sm border border-border-subtle hover:bg-bg-main transition-colors text-text-secondary hover:text-accent-primary"
                      title="Ver detalles"
                      (click)="verDetalle(pedido.id)"
                    >
                      <lucide-icon [img]="Eye" [size]="16"></lucide-icon>
                    </button>
                    <button
                      type="button"
                      class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-pill text-xs border border-accent-primary/40 text-accent-primary hover:bg-accent-primary/10 transition-colors cursor-pointer"
                      [disabled]="updatingId() === pedido.id"
                      (click)="actualizarEstado(pedido)"
                    >
                      <lucide-icon [img]="updatingId() === pedido.id ? Loader : Send" [size]="13" [ngClass]="updatingId() === pedido.id ? 'animate-spin' : ''"></lucide-icon>
                      {{ updatingId() === pedido.id ? 'Guardando...' : 'Aplicar' }}
                    </button>
                  </div>
                </td>
              </tr>

              <tr *ngIf="!loading() && filteredPedidos().length === 0">
                <td colspan="7" class="px-4 py-8 text-center text-text-secondary">
                  No hay pedidos para los filtros seleccionados.
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

      <!-- Modal de Detalle de Pedido -->
      <div *ngIf="selectedPedido() as pedido" class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
        <div class="bg-bg-surface border border-border-subtle rounded-card w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
          <div class="flex items-center justify-between p-5 border-b border-border-subtle bg-bg-main/50">
            <div>
              <h2 class="text-xl font-bold tracking-tight">Pedido #{{ shortId(pedido.id) }}</h2>
              <p class="text-sm text-text-secondary">{{ toDate(pedido.fecha_creacion) }}</p>
            </div>
            <button (click)="cerrarModal()" class="p-2 text-text-secondary hover:text-text-primary rounded-sm hover:bg-bg-main transition-colors">
              <lucide-icon [img]="X" [size]="20"></lucide-icon>
            </button>
          </div>
          
          <div class="p-5 overflow-y-auto space-y-6">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div class="space-y-4">
                <h3 class="text-sm font-semibold uppercase tracking-wider text-text-secondary border-b border-border-subtle pb-2">Datos del Cliente</h3>
                <div class="space-y-2 text-sm">
                  <p><span class="text-text-secondary">Destinatario:</span> <span class="font-medium">{{ pedido.nombre_destinatario }}</span></p>
                  <p><span class="text-text-secondary">Estado actual:</span> 
                    <span class="inline-flex ml-2 px-2 py-0.5 rounded-sm text-xs font-semibold" [ngClass]="estadoBadge(pedido.estado)">
                      {{ humanEstado(pedido.estado) }}
                    </span>
                  </p>
                </div>
              </div>
               
              <div class="space-y-4">
                <h3 class="text-sm font-semibold uppercase tracking-wider text-text-secondary border-b border-border-subtle pb-2">Direccion de Envio</h3>
                <div class="space-y-2 text-sm">
                  <p><span class="text-text-secondary">Direccion:</span> <span class="font-medium">{{ pedido.direccion_envio }}</span></p>
                  <p><span class="text-text-secondary">Ciudad/Pais:</span> <span class="font-medium">{{ pedido.ciudad_envio }}, {{ pedido.pais_envio }}</span></p>
                </div>
              </div>
            </div>

            <div class="space-y-4">
              <h3 class="text-sm font-semibold uppercase tracking-wider text-text-secondary border-b border-border-subtle pb-2">Items del Pedido</h3>
              <div class="rounded-sm border border-border-subtle overflow-hidden">
                <table class="w-full text-left text-sm">
                  <thead class="bg-bg-main border-b border-border-subtle text-text-secondary uppercase tracking-[0.1em] text-[10px]">
                    <tr>
                      <th class="px-3 py-2">Producto</th>
                      <th class="px-3 py-2">SKU</th>
                      <th class="px-3 py-2 text-right">Cant.</th>
                      <th class="px-3 py-2 text-right">Subtotal</th>
                      <th class="px-3 py-2 text-right">IGV (18%)</th>
                      <th class="px-3 py-2 text-right">Importe</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-border-subtle">
                    <tr *ngFor="let item of pedido.items" class="hover:bg-bg-main/30">
                      <td class="px-3 py-2 font-medium">{{ item.nombre_producto }}</td>
                      <td class="px-3 py-2 text-text-secondary">{{ item.sku_producto }}</td>
                      <td class="px-3 py-2 text-right">{{ item.cantidad }}</td>
                      <td class="px-3 py-2 text-right">{{ item.subtotal_sin_igv | currency:'PEN':'S/ ' }}</td>
                      <td class="px-3 py-2 text-right text-emerald-300">{{ item.igv_total | currency:'PEN':'S/ ' }}</td>
                      <td class="px-3 py-2 text-right font-semibold">{{ item.subtotal_con_igv | currency:'PEN':'S/ ' }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div class="flex justify-end pt-4 border-t border-border-subtle">
              <div class="w-full max-w-xs space-y-2 text-sm">
                <div class="flex justify-between text-text-secondary">
                  <span>Subtotal:</span>
                  <span>{{ pedido.subtotal_sin_igv | currency:'PEN':'S/ ' }}</span>
                </div>
                <div class="flex justify-between text-text-secondary">
                  <span>IGV total:</span>
                  <span>{{ pedido.igv_total | currency:'PEN':'S/ ' }}</span>
                </div>
                <div *ngIf="pedido.descuento > 0" class="flex justify-between text-text-secondary">
                  <span>Descuento:</span>
                  <span>-{{ pedido.descuento | currency:'PEN':'S/ ' }}</span>
                </div>
                <div class="flex justify-between text-text-secondary">
                  <span>Envío:</span>
                  <span>{{ pedido.costo_envio | currency:'PEN':'S/ ' }}</span>
                </div>
                <div class="flex justify-between font-bold text-lg pt-2 border-t border-border-subtle">
                  <span>Total:</span>
                  <span class="text-accent-primary">{{ pedido.total_con_igv | currency:'PEN':'S/ ' }}</span>
                </div>
              </div>
            </div>
          </div>
          
          <div class="p-5 border-t border-border-subtle bg-bg-main/50 flex justify-end">
            <app-button variant="secondary" (onClick)="cerrarModal()">Cerrar</app-button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: []
})
export class AdminPedidosComponent implements OnInit {
  private readonly adminService = inject(AdminService);
  private readonly toast = inject(ToastService);
  private readonly IGV_RATE = 0.18;

  readonly Search = Search;
  readonly ChevronDown = ChevronDown;
  readonly PackageCheck = PackageCheck;
  readonly Send = Send;
  readonly Loader = Loader;
  readonly Eye = Eye;
  readonly X = X;

  readonly estadoOptions: EstadoOption[] = [
    { label: 'Pendiente', value: 'pendiente' },
    { label: 'Pagado', value: 'pagado' },
    { label: 'En preparacion', value: 'en_preparacion' },
    { label: 'Enviado', value: 'enviado' },
    { label: 'Entregado', value: 'entregado' },
    { label: 'Cancelado', value: 'cancelado' },
  ];

  readonly pedidos = signal<AdminPedido[]>([]);
  readonly filteredPedidos = signal<AdminPedido[]>([]);
  readonly loading = signal(true);
  readonly updatingId = signal<string | null>(null);

  readonly page = signal(1);
  readonly pageSize = signal(10);
  readonly total = signal(0);
  readonly totalPages = signal(0);

  readonly nextEstado = signal<Record<string, EstadoPedido>>({});
  readonly selectedPedido = signal<AdminPedidoDetalleView | null>(null);

  searchText = '';
  estadoFilter: '' | EstadoPedido = '';

  ngOnInit(): void {
    this.cargarPedidos();
  }

  aplicarFiltros(): void {
    this.page.set(1);
    this.cargarPedidos();
  }

  limpiarFiltros(): void {
    this.searchText = '';
    this.estadoFilter = '';
    this.page.set(1);
    this.cargarPedidos();
  }

  verDetalle(pedidoId: string): void {
    this.adminService.getPedidoDetalle(pedidoId).subscribe({
      next: (data) => {
        this.selectedPedido.set(this.buildPedidoDetalleView(data));
      },
      error: () => {
        this.toast.error('Error al cargar detalle del pedido');
      }
    });
  }

  cerrarModal(): void {
    this.selectedPedido.set(null);
  }

  changePage(nextPage: number): void {
    if (nextPage < 1 || (this.totalPages() > 0 && nextPage > this.totalPages())) {
      return;
    }

    this.page.set(nextPage);
    this.cargarPedidos();
  }

  setNextEstado(pedidoId: string, estado: EstadoPedido): void {
    this.nextEstado.update((current) => ({
      ...current,
      [pedidoId]: estado,
    }));
  }

  nextEstadoFor(pedidoId: string): EstadoPedido {
    return this.nextEstado()[pedidoId] ?? this.getPedidoState(pedidoId) ?? 'pendiente';
  }

  actualizarEstado(pedido: AdminPedido): void {
    if (this.updatingId()) {
      return;
    }

    const estado = this.nextEstadoFor(pedido.id);
    if (estado === pedido.estado) {
      return;
    }

    this.updatingId.set(pedido.id);

    this.adminService.updatePedidoEstado(pedido.id, {
      estado,
      comentario: `Actualizado desde panel admin a ${this.humanEstado(estado)}`,
    }).subscribe({
      next: () => {
        this.pedidos.update((list) =>
          list.map((item) =>
            item.id === pedido.id
              ? {
                  ...item,
                  estado,
                }
              : item
          )
        );

        this.syncFilteredFromPedidos();
        this.updatingId.set(null);
        this.toast.success(`Pedido actualizado a ${this.humanEstado(estado)}.`);
      },
      error: () => {
        this.updatingId.set(null);
      },
    });
  }

  humanEstado(estado: EstadoPedido): string {
    switch (estado) {
      case 'en_preparacion':
        return 'En preparacion';
      default:
        return estado.charAt(0).toUpperCase() + estado.slice(1);
    }
  }

  estadoBadge(estado: EstadoPedido): string {
    switch (estado) {
      case 'pendiente':
        return 'bg-amber-500/15 text-amber-300';
      case 'pagado':
        return 'bg-sky-500/15 text-sky-300';
      case 'en_preparacion':
        return 'bg-violet-500/15 text-violet-300';
      case 'enviado':
        return 'bg-blue-500/15 text-blue-300';
      case 'entregado':
        return 'bg-emerald-500/15 text-emerald-300';
      case 'cancelado':
        return 'bg-rose-500/15 text-rose-300';
      default:
        return 'bg-bg-main text-text-secondary';
    }
  }

  shortId(value: string): string {
    return value.length > 8 ? value.slice(0, 8) : value;
  }

  toDate(value: string): string {
    return new Intl.DateTimeFormat('es-PE', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(value));
  }

  private cargarPedidos(): void {
    this.loading.set(true);

    this.adminService.getPedidos({
      page: this.page(),
      page_size: this.pageSize(),
      estado: this.estadoFilter,
    }).subscribe({
      next: (response) => {
        this.applyPagination(response);
        this.applySearchLocally();
        this.loading.set(false);
      },
      error: () => {
        this.pedidos.set([]);
        this.filteredPedidos.set([]);
        this.total.set(0);
        this.totalPages.set(0);
        this.loading.set(false);
      },
    });
  }

  private applyPagination(response: PaginatedResponse<AdminPedido>): void {
    this.pedidos.set(response.items);
    this.page.set(response.page);
    this.pageSize.set(response.page_size);
    this.total.set(response.total);
    this.totalPages.set(response.total_pages);

    const defaults: Record<string, EstadoPedido> = {};
    response.items.forEach((pedido) => {
      defaults[pedido.id] = pedido.estado;
    });
    this.nextEstado.set(defaults);
  }

  private applySearchLocally(): void {
    const term = this.searchText.trim().toLowerCase();
    if (!term) {
      this.filteredPedidos.set(this.pedidos());
      return;
    }

    this.filteredPedidos.set(
      this.pedidos().filter((pedido) =>
        pedido.id.toLowerCase().includes(term) || this.shortId(pedido.id).toLowerCase().includes(term)
      )
    );
  }

  private syncFilteredFromPedidos(): void {
    this.applySearchLocally();
  }

  private getPedidoState(pedidoId: string): EstadoPedido | undefined {
    return this.pedidos().find((pedido) => pedido.id === pedidoId)?.estado;
  }

  private buildPedidoDetalleView(pedido: AdminPedidoDetalle): AdminPedidoDetalleView {
    const items = (pedido.items ?? []).map((item) => {
      const precioUnitario = this.toAmount(item.precio_unitario);
      const cantidad = Math.max(0, this.toAmount(item.cantidad));
      const igvUnitario = this.roundMoney(precioUnitario * this.IGV_RATE);
      const igvTotal = this.roundMoney(igvUnitario * cantidad);
      const subtotalSinIgv = this.roundMoney((precioUnitario - igvUnitario) * cantidad);
      const subtotalConIgv = this.roundMoney(precioUnitario * cantidad);

      return {
        ...item,
        precio_unitario: precioUnitario,
        cantidad,
        igv_unitario: igvUnitario,
        igv_total: igvTotal,
        subtotal_sin_igv: subtotalSinIgv,
        subtotal_con_igv: subtotalConIgv,
      };
    });

    const subtotalSinIgv = this.roundMoney(items.reduce((acc, item) => acc + item.subtotal_sin_igv, 0));
    const subtotalConIgv = this.roundMoney(items.reduce((acc, item) => acc + item.subtotal_con_igv, 0));
    const igvTotal = this.roundMoney(items.reduce((acc, item) => acc + item.igv_total, 0));
    const descuento = this.toAmount(pedido.descuento);
    const costoEnvio = this.toAmount(pedido.costo_envio);
    const totalConIgv = this.roundMoney(subtotalConIgv - descuento + costoEnvio);

    return {
      ...pedido,
      items,
      descuento,
      costo_envio: costoEnvio,
      igv_total: igvTotal,
      subtotal_sin_igv: subtotalSinIgv,
      subtotal_con_igv: subtotalConIgv,
      total_con_igv: totalConIgv,
    };
  }

  private toAmount(value: unknown): number {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  private roundMoney(value: number): number {
    return Math.round((value + Number.EPSILON) * 100) / 100;
  }
}
