import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  AdminService,
  DashboardKPIs,
  DashboardPeriodo,
  PedidosPorEstado,
  ProductoTop,
  VentasPorPeriodo,
} from '../../../core/services/admin.service';
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  Download,
  LucideAngularModule,
  Package,
  ShoppingBag,
  Sparkles,
  Users,
} from 'lucide-angular';
import { ButtonComponent } from '../../../shared/components/button/button.component';
import { ToastService } from '../../../core/services/toast.service';

interface KpiCard {
  label: string;
  value: string;
  trend: string;
  tone: 'positive' | 'neutral' | 'warning';
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, LucideAngularModule, ButtonComponent],
  template: `
    <div class="relative max-w-7xl mx-auto space-y-8 pb-10 text-text-primary admin-surface">
      <div class="admin-grid-glow" aria-hidden="true"></div>

      <section class="relative rounded-card border border-border-subtle bg-bg-surface/80 backdrop-blur-md p-6 md:p-8 overflow-hidden">
        <div class="absolute -right-24 -top-24 w-64 h-64 rounded-full admin-orb"></div>
        <div class="absolute inset-0 opacity-20 admin-noise"></div>

        <div class="relative flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div class="space-y-2">
            <p class="uppercase text-[11px] tracking-[0.25em] text-text-secondary">Control Center</p>
            <h1 class="text-3xl md:text-4xl font-black tracking-tight">Pulso Comercial</h1>
            <p class="text-text-secondary max-w-2xl">
              Visualiza ventas, comportamiento de pedidos y productos que aceleran el ingreso en tiempo real.
            </p>
          </div>

          <div class="flex flex-wrap items-center gap-3">
            <div class="inline-flex rounded-pill border border-border-subtle p-1 bg-bg-main/60">
              <button
                *ngFor="let option of periodOptions"
                type="button"
                class="px-4 py-1.5 text-sm rounded-pill transition-all duration-300 cursor-pointer"
                [ngClass]="activePeriodo() === option.value
                  ? 'bg-accent-primary text-text-inverse shadow-[0_0_20px_rgba(223,227,29,0.35)]'
                  : 'text-text-secondary hover:text-text-primary'"
                (click)="cambiarPeriodo(option.value)"
              >
                {{ option.label }}
              </button>
            </div>

            <app-button variant="secondary" (onClick)="descargarReporte()" [disabled]="descargando()">
              <span class="inline-flex items-center gap-2">
                <lucide-icon [img]="Download" [size]="16"></lucide-icon>
                {{ descargando() ? 'Generando...' : 'Descargar PDF' }}
              </span>
            </app-button>
          </div>
        </div>
      </section>

      <section *ngIf="loadingOverview()" class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <div *ngFor="let skeleton of [1,2,3,4]" class="h-32 rounded-card border border-border-subtle bg-bg-surface animate-pulse"></div>
      </section>

      <section *ngIf="!loadingOverview()" class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <article
          *ngFor="let card of cards(); let index = index"
          class="rounded-card border border-border-subtle bg-bg-surface/90 p-5 hover:-translate-y-1 transition-transform duration-300 animate-fade-up"
          [style.animationDelay.ms]="index * 80"
        >
          <p class="text-xs uppercase tracking-[0.2em] text-text-secondary">{{ card.label }}</p>
          <p class="text-3xl font-black mt-3">{{ card.value }}</p>
          <p class="text-xs mt-4 inline-flex items-center gap-1"
             [ngClass]="card.tone === 'positive' ? 'text-emerald-400' : card.tone === 'warning' ? 'text-amber-400' : 'text-text-secondary'">
            <lucide-icon [img]="card.tone === 'positive' ? ArrowUpRight : ArrowDownRight" [size]="13"></lucide-icon>
            {{ card.trend }}
          </p>
        </article>
      </section>

      <section class="grid grid-cols-1 xl:grid-cols-5 gap-6 min-w-0">
        <article class="xl:col-span-3 rounded-card border border-border-subtle bg-bg-surface/90 p-6 min-w-0">
          <div class="flex items-center justify-between mb-6">
            <div>
              <h2 class="text-xl font-black tracking-tight">Ventas por periodo</h2>
              <p class="text-xs text-text-secondary uppercase tracking-[0.2em] mt-1">{{ activePeriodo() }}</p>
            </div>
            <span class="inline-flex items-center gap-2 text-xs text-text-secondary">
              <lucide-icon [img]="Sparkles" [size]="14"></lucide-icon>
              Tendencia viva
            </span>
          </div>

          <div *ngIf="loadingVentas()" class="h-72 rounded-card border border-border-subtle bg-bg-main animate-pulse"></div>

          <div *ngIf="!loadingVentas() && ventasSeries().length > 0" class="h-72 flex items-end gap-2 md:gap-3">
            <div *ngFor="let item of ventasBars()" class="h-full flex-1 flex flex-col justify-end group">
              <div class="relative rounded-t-sm admin-sales-bar transition-transform duration-300 group-hover:-translate-y-1"
                   [style.height.%]="item.height">
                <span class="absolute -top-7 left-1/2 -translate-x-1/2 text-[10px] px-1.5 py-0.5 rounded-sm bg-bg-main border border-border-subtle opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                  {{ item.total | currency:'PEN':'S/ ' }}
                </span>
              </div>
              <p class="text-[10px] text-text-secondary mt-2 text-center truncate">{{ item.label }}</p>
            </div>
          </div>

          <div *ngIf="!loadingVentas() && ventasSeries().length === 0" class="h-72 rounded-card border border-dashed border-border-subtle flex items-center justify-center text-text-secondary text-sm">
            Sin datos de ventas para este periodo.
          </div>
        </article>

        <article class="xl:col-span-2 rounded-card border border-border-subtle bg-bg-surface/90 p-6 min-w-0">
          <h2 class="text-xl font-black tracking-tight">Pedidos por estado</h2>
          <p class="text-text-secondary text-sm mt-1">Distribucion operativa actual</p>

          <div *ngIf="loadingEstados()" class="mt-6 h-72 rounded-card border border-border-subtle bg-bg-main animate-pulse"></div>

          <div *ngIf="!loadingEstados()" class="mt-6 space-y-4">
            <div *ngFor="let status of pedidosEstado()" class="space-y-1">
              <div class="flex items-center justify-between text-sm">
                <span class="capitalize">{{ normalizeEstado(status.estado) }}</span>
                <span class="font-semibold">{{ status.cantidad }}</span>
              </div>
              <div class="h-2 rounded-pill bg-bg-main overflow-hidden border border-border-subtle">
                <div class="h-full rounded-pill"
                     [style.width.%]="getEstadoWidth(status.cantidad)"
                     [ngClass]="getEstadoTone(status.estado)"></div>
              </div>
            </div>
          </div>
        </article>
      </section>

      <section class="grid grid-cols-1 xl:grid-cols-5 gap-6 min-w-0">
        <article class="xl:col-span-3 rounded-card border border-border-subtle bg-bg-surface/90 p-6 min-w-0">
          <div class="flex items-center justify-between">
            <div>
              <h2 class="text-xl font-black tracking-tight">Top productos</h2>
              <p class="text-text-secondary text-sm mt-1">Mayor rotacion e ingresos</p>
            </div>
            <lucide-icon [img]="Package" [size]="18" class="text-accent-primary"></lucide-icon>
          </div>

          <div *ngIf="loadingTop()" class="mt-5 space-y-3">
            <div *ngFor="let skeleton of [1,2,3,4,5]" class="h-14 rounded-sm border border-border-subtle bg-bg-main animate-pulse"></div>
          </div>

          <div *ngIf="!loadingTop() && topProductos().length > 0" class="mt-5 space-y-3">
            <div *ngFor="let producto of topProductos(); let i = index"
                 class="flex items-center justify-between gap-4 rounded-sm border border-border-subtle px-4 py-3 hover:border-accent-primary/50 transition-colors">
              <div class="flex items-center gap-3 min-w-0">
                <span class="w-7 h-7 rounded-full bg-accent-primary/15 text-accent-primary text-xs font-bold inline-flex items-center justify-center flex-shrink-0">
                  {{ i + 1 }}
                </span>
                <div class="min-w-0">
                  <p class="font-semibold truncate">{{ producto.nombre }}</p>
                  <p class="text-xs text-text-secondary truncate">SKU {{ producto.sku }}</p>
                </div>
              </div>
              <div class="text-right">
                <p class="text-sm font-semibold">{{ producto.ingresos | currency:'PEN':'S/ ' }}</p>
                <p class="text-xs text-text-secondary">{{ producto.cantidad_vendida }} uds.</p>
              </div>
            </div>
          </div>

          <div *ngIf="!loadingTop() && topProductos().length === 0"
               class="mt-5 rounded-card border border-dashed border-border-subtle px-4 py-8 text-center text-sm text-text-secondary">
            Aun no hay productos destacados.
          </div>
        </article>

        <article class="xl:col-span-2 rounded-card border border-border-subtle bg-bg-surface/90 p-6 min-w-0">
          <h2 class="text-xl font-black tracking-tight">Riesgo de stock</h2>
          <p class="text-text-secondary text-sm mt-1">Productos por debajo de umbral</p>

          <div *ngIf="loadingStock()" class="mt-5 space-y-3">
            <div *ngFor="let skeleton of [1,2,3,4,5]" class="h-14 rounded-sm border border-border-subtle bg-bg-main animate-pulse"></div>
          </div>

          <div *ngIf="!loadingStock() && bajoStock().length > 0" class="mt-5 space-y-3">
            <div *ngFor="let item of bajoStock()" class="rounded-sm border border-border-subtle px-4 py-3 hover:border-amber-400/60 transition-colors">
              <div class="flex items-start justify-between gap-3">
                <div class="min-w-0">
                  <p class="font-semibold truncate">{{ item.nombre }}</p>
                  <p class="text-xs text-text-secondary truncate">{{ item.sku }}</p>
                </div>
                <span class="inline-flex items-center gap-1 text-amber-400 text-xs">
                  <lucide-icon [img]="AlertTriangle" [size]="13"></lucide-icon>
                  Critico
                </span>
              </div>
              <div class="mt-3 flex items-center justify-between text-xs">
                <span class="text-text-secondary">Disponible {{ item.stock_disponible }}</span>
                <span class="text-text-secondary">Minimo {{ item.stock_minimo }}</span>
              </div>
            </div>
          </div>

          <div *ngIf="!loadingStock() && bajoStock().length === 0"
               class="mt-5 rounded-card border border-dashed border-border-subtle px-4 py-8 text-center text-sm text-text-secondary">
            Todo el inventario esta sobre su minimo.
          </div>
        </article>
      </section>
    </div>
  `,
  styles: `
    .admin-surface {
      background-image:
        radial-gradient(circle at 20% -10%, rgba(223, 227, 29, 0.15), transparent 40%),
        radial-gradient(circle at 80% 10%, rgba(50, 120, 255, 0.12), transparent 38%);
    }

    .admin-grid-glow {
      position: absolute;
      inset: 0;
      pointer-events: none;
      background-image:
        linear-gradient(rgba(255, 255, 255, 0.02) 1px, transparent 1px),
        linear-gradient(90deg, rgba(255, 255, 255, 0.02) 1px, transparent 1px);
      background-size: 30px 30px;
      mask-image: radial-gradient(circle at center, rgba(0, 0, 0, 0.8) 10%, transparent 80%);
    }

    .admin-orb {
      background: radial-gradient(circle at 35% 35%, rgba(223, 227, 29, 0.4), rgba(223, 227, 29, 0.02));
      filter: blur(4px);
    }

    .admin-noise {
      background-image: repeating-linear-gradient(
        45deg,
        rgba(255, 255, 255, 0.015),
        rgba(255, 255, 255, 0.015) 2px,
        transparent 2px,
        transparent 6px
      );
    }

    .admin-sales-bar {
      background: linear-gradient(180deg, rgba(223, 227, 29, 0.95), rgba(223, 227, 29, 0.25));
      border: 1px solid rgba(223, 227, 29, 0.35);
      box-shadow: inset 0 -22px 40px rgba(0, 0, 0, 0.2), 0 0 12px rgba(223, 227, 29, 0.18);
    }

    .animate-fade-up {
      animation: fade-up 500ms ease-out both;
    }

    @keyframes fade-up {
      from {
        opacity: 0;
        transform: translateY(8px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
  `
})
export class DashboardComponent implements OnInit {
  private readonly adminService = inject(AdminService);
  private readonly toast = inject(ToastService);

  readonly Download = Download;
  readonly Sparkles = Sparkles;
  readonly Package = Package;
  readonly AlertTriangle = AlertTriangle;
  readonly ArrowUpRight = ArrowUpRight;
  readonly ArrowDownRight = ArrowDownRight;
  readonly ShoppingBag = ShoppingBag;
  readonly Users = Users;

  readonly periodOptions: { label: string; value: DashboardPeriodo }[] = [
    { label: 'Dia', value: 'dia' },
    { label: 'Semana', value: 'semana' },
    { label: 'Mes', value: 'mes' },
  ];

  readonly activePeriodo = signal<DashboardPeriodo>('mes');

  readonly loadingOverview = signal(true);
  readonly loadingVentas = signal(true);
  readonly loadingTop = signal(true);
  readonly loadingEstados = signal(true);
  readonly loadingStock = signal(true);
  readonly descargando = signal(false);

  readonly kpis = signal<DashboardKPIs | null>(null);
  readonly ventasSeries = signal<VentasPorPeriodo[]>([]);
  readonly topProductos = signal<ProductoTop[]>([]);
  readonly pedidosEstado = signal<PedidosPorEstado[]>([]);
  readonly bajoStock = signal<{
    id: number;
    sku: string;
    nombre: string;
    stock_disponible: number;
    stock_minimo: number;
  }[]>([]);

  readonly cards = computed<KpiCard[]>(() => {
    const k = this.kpis();

    if (!k) {
      return [];
    }

    return [
      {
        label: 'Ventas totales',
        value: this.toCurrency(k.ventas_totales),
        trend: 'Flujo saludable',
        tone: 'positive',
      },
      {
        label: 'Pedidos',
        value: `${k.total_pedidos}`,
        trend: 'Operacion estable',
        tone: 'neutral',
      },
      {
        label: 'Ticket promedio',
        value: this.toCurrency(k.ticket_promedio),
        trend: 'Mayor valor por orden',
        tone: 'positive',
      },
      {
        label: 'Productos bajo stock',
        value: `${k.productos_bajo_stock}`,
        trend: k.productos_bajo_stock > 0 ? 'Atencion requerida' : 'Sin riesgo actual',
        tone: k.productos_bajo_stock > 0 ? 'warning' : 'neutral',
      },
    ];
  });

  readonly ventasBars = computed(() => {
    const series = [...this.ventasSeries()].reverse();
    const max = Math.max(...series.map((item) => item.total), 1);

    return series.map((item) => ({
      total: item.total,
      label: this.formatPeriodoLabel(item.periodo),
      height: Math.max((item.total / max) * 100, 8),
    }));
  });

  readonly totalEstados = computed(() =>
    this.pedidosEstado().reduce((acc, current) => acc + current.cantidad, 0)
  );

  ngOnInit(): void {
    this.loadDashboardData();
  }

  cambiarPeriodo(periodo: DashboardPeriodo): void {
    if (this.activePeriodo() === periodo) {
      return;
    }

    this.activePeriodo.set(periodo);
    this.loadVentas();
  }

  descargarReporte(): void {
    this.descargando.set(true);

    this.adminService.descargarReporteVentas().subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = `reporte_ventas_${Date.now()}.pdf`;
        anchor.click();
        window.URL.revokeObjectURL(url);
        this.descargando.set(false);
        this.toast.success('Reporte PDF generado y descargado.');
      },
      error: (error: unknown) => {
        this.descargando.set(false);
        this.toast.error(this.extractApiMessage(error, 'No se pudo descargar el reporte PDF.'));
      },
    });
  }

  normalizeEstado(estado: string): string {
    return estado.replace('_', ' ');
  }

  getEstadoWidth(cantidad: number): number {
    const total = this.totalEstados();
    if (!total) {
      return 0;
    }

    return (cantidad / total) * 100;
  }

  getEstadoTone(estado: string): string {
    switch (estado) {
      case 'pendiente':
        return 'bg-amber-400';
      case 'pagado':
        return 'bg-sky-400';
      case 'en_preparacion':
        return 'bg-violet-400';
      case 'enviado':
        return 'bg-blue-400';
      case 'entregado':
        return 'bg-emerald-400';
      case 'cancelado':
        return 'bg-rose-400';
      default:
        return 'bg-text-secondary';
    }
  }

  private loadDashboardData(): void {
    this.loadOverview();
    this.loadVentas();
    this.loadTopProductos();
    this.loadPedidosEstado();
    this.loadBajoStock();
  }

  private loadOverview(): void {
    this.loadingOverview.set(true);

    this.adminService.getKpis().subscribe({
      next: (response) => {
        this.kpis.set(response);
        this.loadingOverview.set(false);
      },
      error: (error: unknown) => {
        this.kpis.set(null);
        this.loadingOverview.set(false);
        this.toast.error(this.extractApiMessage(error, 'No se pudieron cargar los KPIs del dashboard.'));
      },
    });
  }

  private loadVentas(): void {
    this.loadingVentas.set(true);

    this.adminService.getVentas(this.activePeriodo()).subscribe({
      next: (response) => {
        this.ventasSeries.set(response);
        this.loadingVentas.set(false);
      },
      error: (error: unknown) => {
        this.ventasSeries.set([]);
        this.loadingVentas.set(false);
        this.toast.warning(this.extractApiMessage(error, 'No se pudieron cargar las ventas por periodo.'));
      },
    });
  }

  private loadTopProductos(): void {
    this.loadingTop.set(true);

    this.adminService.getProductosTop(5).subscribe({
      next: (response) => {
        this.topProductos.set(response);
        this.loadingTop.set(false);
      },
      error: (error: unknown) => {
        this.topProductos.set([]);
        this.loadingTop.set(false);
        this.toast.warning(this.extractApiMessage(error, 'No se pudo cargar el top de productos.'));
      },
    });
  }

  private loadPedidosEstado(): void {
    this.loadingEstados.set(true);

    this.adminService.getPedidosPorEstado().subscribe({
      next: (response) => {
        this.pedidosEstado.set(response);
        this.loadingEstados.set(false);
      },
      error: (error: unknown) => {
        this.pedidosEstado.set([]);
        this.loadingEstados.set(false);
        this.toast.warning(this.extractApiMessage(error, 'No se pudo cargar el estado de pedidos.'));
      },
    });
  }

  private loadBajoStock(): void {
    this.loadingStock.set(true);

    this.adminService.getProductosBajoStock(1, 5).subscribe({
      next: (response) => {
        this.bajoStock.set(response.items.map((item) => ({
          id: item.id,
          sku: item.sku,
          nombre: item.nombre,
          stock_disponible: item.stock_disponible,
          stock_minimo: item.stock_minimo,
        }))); 
        this.loadingStock.set(false);
      },
      error: (error: unknown) => {
        this.bajoStock.set([]);
        this.loadingStock.set(false);
        this.toast.warning(this.extractApiMessage(error, 'No se pudo cargar el riesgo de stock.'));
      },
    });
  }

  private toCurrency(value: number): string {
    return new Intl.NumberFormat('es-PE', {
      style: 'currency',
      currency: 'PEN',
      minimumFractionDigits: 2,
    }).format(value);
  }

  private formatPeriodoLabel(periodo: string): string {
    const date = new Date(periodo);
    if (Number.isNaN(date.getTime())) {
      return periodo;
    }

    if (this.activePeriodo() === 'dia') {
      return new Intl.DateTimeFormat('es-PE', { day: '2-digit', month: 'short' }).format(date);
    }

    if (this.activePeriodo() === 'semana') {
      return `Sem ${new Intl.DateTimeFormat('es-PE', { day: '2-digit', month: 'short' }).format(date)}`;
    }

    return new Intl.DateTimeFormat('es-PE', { month: 'short', year: '2-digit' }).format(date);
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
