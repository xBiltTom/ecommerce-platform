import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AdminService } from '../../../core/services/admin.service';
import { LucideAngularModule, TrendingUp, Users, ShoppingBag, DollarSign, Download } from 'lucide-angular';
import { ButtonComponent } from '../../../shared/components/button/button.component';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, LucideAngularModule, ButtonComponent],
  template: `
    <div class="max-w-7xl mx-auto space-y-8">
      
      <!-- Header -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 class="text-3xl font-bold text-text-primary tracking-tight">Dashboard</h1>
          <p class="text-text-secondary mt-1">Resumen del rendimiento de tu tienda.</p>
        </div>
        <app-button variant="secondary" (onClick)="descargarReporte()" [disabled]="descargando()">
          <span class="flex items-center gap-2">
            <lucide-icon [img]="Download" [size]="16"></lucide-icon>
            {{ descargando() ? 'Generando PDF...' : 'Reporte de Ventas' }}
          </span>
        </app-button>
      </div>

      <!-- KPIs Skeleton -->
      <div *ngIf="loading()" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div *ngFor="let i of [1,2,3,4]" class="bg-bg-surface p-6 rounded-card border border-border-subtle animate-pulse h-32"></div>
      </div>

      <!-- KPIs Reales -->
      <div *ngIf="!loading()" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        
        <div class="bg-bg-surface p-6 rounded-card border border-border-subtle hover:border-accent-primary/50 transition-colors">
          <div class="flex items-start justify-between">
            <div>
              <p class="text-text-secondary text-sm font-medium">Ingresos Totales</p>
              <h3 class="text-2xl font-bold text-text-primary mt-2">{{ (kpis()?.ingresos_totales || 24500.50) | currency:'PEN':'S/ ' }}</h3>
            </div>
            <div class="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center text-green-400">
              <lucide-icon [img]="DollarSign" [size]="20"></lucide-icon>
            </div>
          </div>
          <p class="text-xs text-green-400 flex items-center gap-1 mt-4">
            <lucide-icon [img]="TrendingUp" [size]="12"></lucide-icon> +12.5% este mes
          </p>
        </div>

        <div class="bg-bg-surface p-6 rounded-card border border-border-subtle hover:border-accent-primary/50 transition-colors">
          <div class="flex items-start justify-between">
            <div>
              <p class="text-text-secondary text-sm font-medium">Pedidos Nuevos</p>
              <h3 class="text-2xl font-bold text-text-primary mt-2">{{ kpis()?.pedidos_nuevos || 145 }}</h3>
            </div>
            <div class="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-400">
              <lucide-icon [img]="ShoppingBag" [size]="20"></lucide-icon>
            </div>
          </div>
          <p class="text-xs text-blue-400 flex items-center gap-1 mt-4">
            <lucide-icon [img]="TrendingUp" [size]="12"></lucide-icon> +5.2% esta semana
          </p>
        </div>

        <div class="bg-bg-surface p-6 rounded-card border border-border-subtle hover:border-accent-primary/50 transition-colors">
          <div class="flex items-start justify-between">
            <div>
              <p class="text-text-secondary text-sm font-medium">Nuevos Usuarios</p>
              <h3 class="text-2xl font-bold text-text-primary mt-2">{{ kpis()?.nuevos_usuarios || 89 }}</h3>
            </div>
            <div class="w-10 h-10 rounded-full bg-purple-500/10 flex items-center justify-center text-purple-400">
              <lucide-icon [img]="Users" [size]="20"></lucide-icon>
            </div>
          </div>
          <p class="text-xs text-purple-400 flex items-center gap-1 mt-4">
             +18% este mes
          </p>
        </div>

        <div class="bg-bg-surface p-6 rounded-card border border-border-subtle hover:border-accent-primary/50 transition-colors">
          <div class="flex items-start justify-between">
            <div>
              <p class="text-text-secondary text-sm font-medium">Ticket Promedio</p>
              <h3 class="text-2xl font-bold text-text-primary mt-2">{{ (kpis()?.ticket_promedio || 168.90) | currency:'PEN':'S/ ' }}</h3>
            </div>
            <div class="w-10 h-10 rounded-full bg-accent-primary/10 flex items-center justify-center text-accent-primary">
              <lucide-icon [img]="TrendingUp" [size]="20"></lucide-icon>
            </div>
          </div>
        </div>
      </div>

      <!-- Sección Principal (Gráficos / Tablas) -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        <!-- Mock Gráfico de Ventas (Simulado con CSS por ahora) -->
        <div class="lg:col-span-2 bg-bg-surface border border-border-subtle rounded-card p-6">
          <h3 class="text-lg font-bold text-text-primary mb-6">Visión General de Ventas</h3>
          <div class="h-64 flex items-end justify-between gap-2 px-2">
            <!-- Barras mockeadas -->
            <div *ngFor="let h of [40, 70, 45, 90, 65, 80, 100, 50, 75, 85, 60, 95]" 
                 class="w-full bg-accent-primary/20 hover:bg-accent-primary transition-colors rounded-t-sm relative group cursor-pointer"
                 [style.height.%]="h">
                 <!-- Tooltip -->
                 <div class="opacity-0 group-hover:opacity-100 absolute -top-8 left-1/2 -translate-x-1/2 bg-bg-main text-text-primary text-xs py-1 px-2 rounded pointer-events-none transition-opacity whitespace-nowrap z-10 border border-border-subtle shadow-lg">
                   S/ {{ h * 120 }}
                 </div>
            </div>
          </div>
          <div class="flex justify-between text-text-secondary text-xs mt-4 px-2">
            <span>Ene</span><span>Feb</span><span>Mar</span><span>Abr</span><span>May</span><span>Jun</span><span>Jul</span><span>Ago</span><span>Sep</span><span>Oct</span><span>Nov</span><span>Dic</span>
          </div>
        </div>

        <!-- Productos Más Vendidos -->
        <div class="bg-bg-surface border border-border-subtle rounded-card p-6">
          <h3 class="text-lg font-bold text-text-primary mb-6">Top Productos</h3>
          <div class="space-y-6">
            <div *ngFor="let i of [1,2,3,4]" class="flex items-center gap-4 group cursor-pointer">
              <div class="w-12 h-12 bg-white rounded-sm border border-border-subtle flex-shrink-0 p-1 group-hover:border-accent-primary transition-colors">
                <img src="assets/placeholder.png" class="w-full h-full object-contain">
              </div>
              <div class="flex-grow">
                <h4 class="text-sm font-bold text-text-primary group-hover:text-accent-primary transition-colors line-clamp-1">Protech Quantum Keyboard V{{i}}</h4>
                <p class="text-xs text-text-secondary mt-1">{{ 150 - (i * 20) }} ventas</p>
              </div>
              <div class="text-right">
                <span class="text-sm font-medium text-text-primary">{{ (159.00 * (150 - (i * 20))) | currency:'PEN':'S/ ' }}</span>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  `,
  styles: []
})
export class DashboardComponent implements OnInit {
  private adminService = inject(AdminService);
  
  readonly TrendingUp = TrendingUp;
  readonly Users = Users;
  readonly ShoppingBag = ShoppingBag;
  readonly DollarSign = DollarSign;
  readonly Download = Download;

  loading = signal(true);
  descargando = signal(false);
  kpis = signal<any>(null);

  ngOnInit() {
    this.cargarDatos();
  }

  cargarDatos() {
    this.adminService.getKpis().subscribe({
      next: (data) => {
        this.kpis.set(data);
        this.loading.set(false);
      },
      error: () => {
        // En caso de error, el HTML ya muestra un fallback (Mocks) si kpis() es null
        setTimeout(() => this.loading.set(false), 800);
      }
    });
  }

  descargarReporte() {
    this.descargando.set(true);
    this.adminService.descargarReporteVentas().subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `reporte_ventas_${new Date().getTime()}.pdf`;
        a.click();
        window.URL.revokeObjectURL(url);
        this.descargando.set(false);
      },
      error: () => {
        alert('Error descargando el reporte.');
        this.descargando.set(false);
      }
    });
  }
}
