import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  AdminPedido,
  AdminService,
  EstadoPedido,
  PaginatedResponse,
} from '../../../core/services/admin.service';
import {
  ChevronDown,
  Loader,
  LucideAngularModule,
  PackageCheck,
  Search,
  Send,
} from 'lucide-angular';
import { ButtonComponent } from '../../../shared/components/button/button.component';

interface EstadoOption {
  label: string;
  value: EstadoPedido;
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
                  <button
                    type="button"
                    class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-pill text-xs border border-accent-primary/40 text-accent-primary hover:bg-accent-primary/10 transition-colors cursor-pointer"
                    [disabled]="updatingId() === pedido.id"
                    (click)="actualizarEstado(pedido)"
                  >
                    <lucide-icon [img]="updatingId() === pedido.id ? Loader : Send" [size]="13" [ngClass]="updatingId() === pedido.id ? 'animate-spin' : ''"></lucide-icon>
                    {{ updatingId() === pedido.id ? 'Guardando...' : 'Aplicar' }}
                  </button>
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
    </div>
  `,
  styles: []
})
export class AdminPedidosComponent implements OnInit {
  private readonly adminService = inject(AdminService);

  readonly Search = Search;
  readonly ChevronDown = ChevronDown;
  readonly PackageCheck = PackageCheck;
  readonly Send = Send;
  readonly Loader = Loader;

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
}
