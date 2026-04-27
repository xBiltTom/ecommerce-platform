import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule, CurrencyPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  AdminService,
  DashboardPeriodo,
  PedidosPorEstado,
  ProductoTop,
  EstadisticasDashboard
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
  FileText,
  PieChart as PieChartIcon
} from 'lucide-angular';
import { ButtonComponent } from '../../../shared/components/button/button.component';
import { ToastService } from '../../../core/services/toast.service';
import { BaseChartDirective } from 'ng2-charts';
import { Chart, ChartConfiguration, ChartOptions } from 'chart.js';

// Configurar colores globales para Chart.js en Dark Mode
Chart.defaults.color = '#94A3B8';
Chart.defaults.font.family = 'Inter, Helvetica, sans-serif';

interface KpiCard {
  label: string;
  value: string;
  trend: string;
  tone: 'positive' | 'neutral' | 'warning';
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule, ButtonComponent, BaseChartDirective],
  template: `
    <div class="relative max-w-7xl mx-auto space-y-8 pb-10 text-text-primary admin-surface">
      <div class="admin-grid-glow" aria-hidden="true"></div>

      <!-- Cabecera y selectores de periodo -->
      <section class="relative rounded-card border border-border-subtle bg-bg-surface/80 backdrop-blur-md p-6 md:p-8 overflow-hidden">
        <div class="absolute -right-24 -top-24 w-64 h-64 rounded-full admin-orb"></div>
        <div class="absolute inset-0 opacity-20 admin-noise"></div>

        <div class="relative flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div class="space-y-2">
            <p class="uppercase text-[11px] tracking-[0.25em] text-text-secondary">Control Center</p>
            <h1 class="text-3xl md:text-4xl font-black tracking-tight">Pulso Comercial</h1>
            <p class="text-text-secondary max-w-2xl">
              Visualiza estadísticas unificadas en tiempo real.
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
          </div>
        </div>
      </section>

      <!-- Skeleton de Tarjetas -->
      <section *ngIf="loadingEstadisticas()" class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <div *ngFor="let skeleton of [1,2,3,4]" class="h-32 rounded-card border border-border-subtle bg-bg-surface animate-pulse"></div>
      </section>

      <!-- Tarjetas KPIs -->
      <section *ngIf="!loadingEstadisticas()" class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
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

      <!-- Panel de Descarga de Reportes PDF -->
      <section class="rounded-card border border-border-subtle bg-bg-surface/90 p-6 animate-fade-up" style="animation-delay: 200ms;">
        <div class="flex items-center gap-2 mb-4">
          <lucide-icon [img]="FileText" [size]="20" class="text-accent-primary"></lucide-icon>
          <h2 class="text-lg font-black tracking-tight">Centro de Reportes PDF</h2>
        </div>
        
        <div class="flex flex-col md:flex-row items-end gap-4">
          <div class="flex-1 w-full flex flex-col sm:flex-row gap-4">
            <div class="flex-1 space-y-1">
              <label class="text-xs uppercase tracking-[0.1em] text-text-secondary">Fecha Inicio</label>
              <input type="date" [(ngModel)]="fechaInicio" class="w-full bg-bg-main border border-border-subtle rounded-sm px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent-primary">
            </div>
            <div class="flex-1 space-y-1">
              <label class="text-xs uppercase tracking-[0.1em] text-text-secondary">Fecha Fin</label>
              <input type="date" [(ngModel)]="fechaFin" class="w-full bg-bg-main border border-border-subtle rounded-sm px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent-primary">
            </div>
          </div>
          <div class="flex gap-3 w-full md:w-auto">
            <app-button variant="secondary" (onClick)="descargarOperacional()" [disabled]="descargandoOperacional()" class="flex-1 md:flex-none">
              <span class="inline-flex items-center justify-center gap-2">
                <lucide-icon [img]="Download" [size]="16"></lucide-icon>
                {{ descargandoOperacional() ? 'Generando...' : 'Reporte Operacional' }}
              </span>
            </app-button>
            <app-button variant="primary" (onClick)="descargarGestion()" [disabled]="descargandoGestion()" class="flex-1 md:flex-none">
              <span class="inline-flex items-center justify-center gap-2 text-black">
                <lucide-icon [img]="Download" [size]="16"></lucide-icon>
                {{ descargandoGestion() ? 'Generando...' : 'Reporte de Gestión' }}
              </span>
            </app-button>
          </div>
        </div>
      </section>

      <!-- Sección de Gráficos: Timeline de Ventas y Distribución por Categoría -->
      <section class="grid grid-cols-1 xl:grid-cols-5 gap-6 min-w-0">
        <!-- Gráfico de Evolución de Ventas -->
        <article class="xl:col-span-3 rounded-card border border-border-subtle bg-bg-surface/90 p-6 min-w-0 animate-fade-up" style="animation-delay: 300ms;">
          <div class="flex items-center justify-between mb-6">
            <div>
              <h2 class="text-xl font-black tracking-tight">Evolución de Ingresos</h2>
              <p class="text-xs text-text-secondary uppercase tracking-[0.2em] mt-1">{{ activePeriodo() }}</p>
            </div>
            <span class="inline-flex items-center gap-2 text-xs text-text-secondary">
              <lucide-icon [img]="Sparkles" [size]="14"></lucide-icon>
              Tendencia viva
            </span>
          </div>

          <div *ngIf="loadingEstadisticas()" class="h-72 rounded-card border border-border-subtle bg-bg-main animate-pulse"></div>

          <div *ngIf="!loadingEstadisticas() && ventasChartData().labels?.length" class="h-72 relative">
            <canvas baseChart
              [data]="ventasChartData()"
              [options]="lineChartOptions"
              type="line">
            </canvas>
          </div>

          <div *ngIf="!loadingEstadisticas() && !ventasChartData().labels?.length" class="h-72 rounded-card border border-dashed border-border-subtle flex items-center justify-center text-text-secondary text-sm">
            Sin datos de ventas para este periodo.
          </div>
        </article>

        <!-- Gráfico de Distribución por Categoría -->
        <article class="xl:col-span-2 rounded-card border border-border-subtle bg-bg-surface/90 p-6 min-w-0 animate-fade-up" style="animation-delay: 400ms;">
          <div class="flex items-center justify-between mb-6">
            <div>
              <h2 class="text-xl font-black tracking-tight">Ingresos por Categoría</h2>
              <p class="text-text-secondary text-sm mt-1">Distribución del valor de ventas</p>
            </div>
            <lucide-icon [img]="PieChartIcon" [size]="18" class="text-accent-primary"></lucide-icon>
          </div>

          <div *ngIf="loadingEstadisticas()" class="h-72 rounded-card border border-border-subtle bg-bg-main animate-pulse"></div>

          <div *ngIf="!loadingEstadisticas() && categoriaChartData().labels?.length" class="h-72 relative flex justify-center items-center">
            <canvas baseChart
              [data]="categoriaChartData()"
              [options]="pieChartOptions"
              type="doughnut">
            </canvas>
          </div>
          
          <div *ngIf="!loadingEstadisticas() && !categoriaChartData().labels?.length" class="h-72 rounded-card border border-dashed border-border-subtle flex items-center justify-center text-text-secondary text-sm">
            Sin datos de categorías.
          </div>
        </article>
      </section>

      <!-- Manteniendo las otras vistas del panel para no perder funcionalidad previa -->
      <section class="grid grid-cols-1 xl:grid-cols-5 gap-6 min-w-0">
        <article class="xl:col-span-3 rounded-card border border-border-subtle bg-bg-surface/90 p-6 min-w-0">
          <div class="flex items-center justify-between">
            <div>
              <h2 class="text-xl font-black tracking-tight">Top productos</h2>
              <p class="text-text-secondary text-sm mt-1">Mayor rotación histórica</p>
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
        </article>

        <article class="xl:col-span-2 rounded-card border border-border-subtle bg-bg-surface/90 p-6 min-w-0">
          <h2 class="text-xl font-black tracking-tight">Pedidos por estado</h2>
          <p class="text-text-secondary text-sm mt-1">Distribución operativa actual</p>

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
  readonly FileText = FileText;
  readonly PieChartIcon = PieChartIcon;

  readonly periodOptions: { label: string; value: DashboardPeriodo }[] = [
    { label: 'Día', value: 'dia' },
    { label: 'Semana', value: 'semana' },
    { label: 'Mes', value: 'mes' },
  ];

  readonly activePeriodo = signal<DashboardPeriodo>('mes');

  readonly loadingEstadisticas = signal(true);
  readonly loadingTop = signal(true);
  readonly loadingEstados = signal(true);
  
  readonly descargandoOperacional = signal(false);
  readonly descargandoGestion = signal(false);

  // Fecha para descargas
  fechaInicio: string = this.getFirstDayOfMonth();
  fechaFin: string = this.getToday();

  readonly estadisticas = signal<EstadisticasDashboard | null>(null);
  readonly topProductos = signal<ProductoTop[]>([]);
  readonly pedidosEstado = signal<PedidosPorEstado[]>([]);

  // ── Opciones para Chart.js ──
  public lineChartOptions: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        mode: 'index',
        intersect: false,
        backgroundColor: 'rgba(15, 23, 42, 0.9)',
        titleColor: '#E2E8F0',
        bodyColor: '#38BDF8',
        borderColor: '#1E293B',
        borderWidth: 1,
      }
    },
    scales: {
      x: { grid: { display: false, color: '#1E293B' } },
      y: { grid: { color: 'rgba(30, 41, 59, 0.5)' }, border: { dash: [4, 4] }, beginAtZero: true }
    }
  };

  public pieChartOptions: ChartOptions<'doughnut'> = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '65%',
    plugins: {
      legend: { position: 'right', labels: { usePointStyle: true, boxWidth: 8, padding: 20 } },
      tooltip: { backgroundColor: 'rgba(15, 23, 42, 0.9)', borderColor: '#1E293B', borderWidth: 1 }
    }
  };

  // ── Computed Properties ──
  readonly cards = computed<KpiCard[]>(() => {
    const data = this.estadisticas();
    if (!data) return [];

    return [
      {
        label: 'Ventas totales',
        value: this.toCurrency(data.metricas.ventas_totales),
        trend: 'Flujo del periodo',
        tone: 'positive',
      },
      {
        label: 'Pedidos Facturados',
        value: `${data.metricas.total_pedidos}`,
        trend: 'Operación activa',
        tone: 'neutral',
      },
      {
        label: 'Ticket Promedio',
        value: this.toCurrency(data.metricas.ticket_promedio),
        trend: 'Ingreso por cliente',
        tone: 'positive',
      },
      {
        label: 'Clientes Diferentes',
        value: `${data.metricas.total_clientes}`,
        trend: 'Base activa',
        tone: 'neutral',
      },
    ];
  });

  readonly ventasChartData = computed<ChartConfiguration<'line'>['data']>(() => {
    const data = this.estadisticas()?.ventas_timeline || [];
    return {
      labels: data.map(d => this.formatPeriodoLabel(d.fecha)),
      datasets: [
        {
          data: data.map(d => d.ingresos),
          label: 'Ingresos (S/.)',
          fill: true,
          tension: 0.4,
          borderColor: '#38BDF8', // Cyan
          backgroundColor: 'rgba(56, 189, 248, 0.1)',
          pointBackgroundColor: '#0F172A',
          pointBorderColor: '#38BDF8',
          pointHoverBackgroundColor: '#38BDF8',
          pointHoverBorderColor: '#fff',
        }
      ]
    };
  });

  readonly categoriaChartData = computed<ChartConfiguration<'doughnut'>['data']>(() => {
    const data = this.estadisticas()?.ventas_por_categoria || [];
    return {
      labels: data.map(d => d.categoria),
      datasets: [
        {
          data: data.map(d => d.ingresos),
          backgroundColor: [
            '#38BDF8', // Cyan
            '#A78BFA', // Violet
            '#10B981', // Emerald
            '#F59E0B', // Amber
            '#F43F5E', // Rose
            '#6366F1'  // Indigo
          ],
          borderColor: '#0F172A',
          borderWidth: 2,
          hoverOffset: 4
        }
      ]
    };
  });

  readonly totalEstados = computed(() =>
    this.pedidosEstado().reduce((acc, current) => acc + current.cantidad, 0)
  );

  ngOnInit(): void {
    this.loadDashboardData();
  }

  cambiarPeriodo(periodo: DashboardPeriodo): void {
    if (this.activePeriodo() === periodo) return;
    this.activePeriodo.set(periodo);
    this.loadEstadisticasUnificadas();
  }

  private loadDashboardData(): void {
    this.loadEstadisticasUnificadas();
    this.loadTopProductos();
    this.loadPedidosEstado();
  }

  private loadEstadisticasUnificadas(): void {
    this.loadingEstadisticas.set(true);
    this.adminService.getEstadisticasDashboard(this.activePeriodo()).subscribe({
      next: (response) => {
        this.estadisticas.set(response);
        this.loadingEstadisticas.set(false);
      },
      error: () => {
        this.estadisticas.set(null);
        this.loadingEstadisticas.set(false);
      },
    });
  }

  // ── Descarga de PDFs ──
  
  descargarOperacional(): void {
    if (!this.fechaInicio || !this.fechaFin) {
      this.toast.error('Debe seleccionar las fechas de inicio y fin.');
      return;
    }
    
    this.descargandoOperacional.set(true);
    this.adminService.descargarReporteOperacional(this.fechaInicio, this.fechaFin).subscribe({
      next: (blob) => {
        this.triggerDownload(blob, `reporte_operacional_${this.fechaInicio}_${this.fechaFin}.pdf`);
        this.descargandoOperacional.set(false);
        this.toast.success('Reporte Operacional generado y descargado.');
      },
      error: () => {
        this.descargandoOperacional.set(false);
        this.toast.error('Error al generar el reporte operacional.');
      },
    });
  }

  descargarGestion(): void {
    if (!this.fechaInicio || !this.fechaFin) {
      this.toast.error('Debe seleccionar las fechas de inicio y fin.');
      return;
    }

    this.descargandoGestion.set(true);
    this.adminService.descargarReporteGestion(this.fechaInicio, this.fechaFin).subscribe({
      next: (blob) => {
        this.triggerDownload(blob, `reporte_gestion_${this.fechaInicio}_${this.fechaFin}.pdf`);
        this.descargandoGestion.set(false);
        this.toast.success('Reporte de Gestión generado y descargado.');
      },
      error: () => {
        this.descargandoGestion.set(false);
        this.toast.error('Error al generar el reporte de gestión.');
      },
    });
  }

  private triggerDownload(blob: Blob, filename: string): void {
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    window.URL.revokeObjectURL(url);
  }

  // ── Helpers ──

  private loadTopProductos(): void {
    this.loadingTop.set(true);
    this.adminService.getProductosTop(5).subscribe({
      next: (response) => {
        this.topProductos.set(response);
        this.loadingTop.set(false);
      },
      error: () => {
        this.topProductos.set([]);
        this.loadingTop.set(false);
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
      error: () => {
        this.pedidosEstado.set([]);
        this.loadingEstados.set(false);
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

  private formatPeriodoLabel(fechaStr: string): string {
    const date = new Date(fechaStr);
    if (Number.isNaN(date.getTime())) return fechaStr;

    if (this.activePeriodo() === 'dia') {
      return new Intl.DateTimeFormat('es-PE', { day: '2-digit', month: 'short' }).format(date);
    }
    if (this.activePeriodo() === 'semana') {
      return `Sem ${new Intl.DateTimeFormat('es-PE', { day: '2-digit', month: 'short' }).format(date)}`;
    }
    return new Intl.DateTimeFormat('es-PE', { month: 'short', year: '2-digit' }).format(date);
  }

  normalizeEstado(estado: string): string {
    return estado.replace('_', ' ');
  }

  getEstadoWidth(cantidad: number): number {
    const total = this.totalEstados();
    return total ? (cantidad / total) * 100 : 0;
  }

  getEstadoTone(estado: string): string {
    switch (estado) {
      case 'pendiente': return 'bg-amber-400';
      case 'pagado': return 'bg-sky-400';
      case 'en_preparacion': return 'bg-violet-400';
      case 'enviado': return 'bg-blue-400';
      case 'entregado': return 'bg-emerald-400';
      case 'cancelado': return 'bg-rose-400';
      default: return 'bg-text-secondary';
    }
  }

  private getFirstDayOfMonth(): string {
    const date = new Date();
    date.setDate(1);
    return date.toISOString().split('T')[0];
  }

  private getToday(): string {
    return new Date().toISOString().split('T')[0];
  }
}
