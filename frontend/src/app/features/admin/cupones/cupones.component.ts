import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import {
  LucideAngularModule,
  Ticket,
  Plus,
  X,
  Tag,
  CalendarClock,
  CheckCircle2,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
} from 'lucide-angular';
import { AdminService, CuponDescuento, CuponCreatePayload } from '../../../core/services/admin.service';
import { ToastService } from '../../../core/services/toast.service';
import { ButtonComponent } from '../../../shared/components/button/button.component';
import { InputComponent } from '../../../shared/components/input/input.component';

@Component({
  selector: 'app-admin-cupones',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, ButtonComponent, InputComponent, LucideAngularModule],
  template: `
    <div class="space-y-8">
      <!-- Header -->
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 class="text-2xl font-bold text-text-primary tracking-tight flex items-center gap-2">
            <lucide-icon [img]="Ticket" [size]="24" class="text-accent-primary"></lucide-icon>
            Cupones de Descuento
          </h1>
          <p class="text-text-secondary mt-1 text-sm">Crea y gestiona códigos de descuento para tus clientes.</p>
        </div>
        <app-button variant="primary" (onClick)="toggleForm()">
          <span class="flex items-center gap-2">
            <lucide-icon [img]="mostrarFormulario() ? X : Plus" [size]="16"></lucide-icon>
            {{ mostrarFormulario() ? 'Cancelar' : 'Nuevo Cupón' }}
          </span>
        </app-button>
      </div>

      <!-- Formulario Crear -->
      <div *ngIf="mostrarFormulario()" class="bg-bg-surface rounded-card border border-border-subtle p-6 space-y-5">
        <h3 class="text-lg font-semibold text-text-primary">Nuevo Cupón</h3>
        <form [formGroup]="cuponForm" (ngSubmit)="guardarCupon()" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <app-input label="Código" formControlName="codigo" id="codigo" placeholder="EJ: VERANO25"></app-input>
          <div>
            <label class="block text-sm font-medium text-text-primary mb-1">Tipo</label>
            <select formControlName="tipo_descuento" class="w-full rounded-card border border-border-subtle bg-bg-main px-4 py-2.5 text-sm text-text-primary focus:outline-none focus:border-accent-primary">
              <option value="porcentaje">Porcentaje (%)</option>
              <option value="monto_fijo">Monto Fijo (S/)</option>
            </select>
          </div>
          <app-input label="Valor" formControlName="valor" id="valor" type="number" placeholder="25"></app-input>
          <app-input label="Días de Expiración" formControlName="dias_expiracion" id="dias_expiracion" type="number" placeholder="30"></app-input>
          <div class="sm:col-span-2 lg:col-span-4 flex justify-end">
            <app-button type="submit" variant="primary" [disabled]="cuponForm.invalid || guardando()">
              {{ guardando() ? 'Guardando...' : 'Crear Cupón' }}
            </app-button>
          </div>
        </form>
      </div>

      <!-- Tabla Cupones -->
      <div class="bg-bg-surface rounded-card border border-border-subtle overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full text-sm text-left">
            <thead class="bg-bg-main text-text-secondary uppercase text-xs tracking-wider">
              <tr>
                <th class="px-6 py-4 font-semibold">Código</th>
                <th class="px-6 py-4 font-semibold">Tipo</th>
                <th class="px-6 py-4 font-semibold">Valor</th>
                <th class="px-6 py-4 font-semibold">Expira</th>
                <th class="px-6 py-4 font-semibold">Estado</th>
                <th class="px-6 py-4 font-semibold">Pedido</th>
                <th class="px-6 py-4 font-semibold">Creado</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-border-subtle">
              <tr *ngFor="let cupon of cupones()" class="hover:bg-bg-main/50 transition-colors">
                <td class="px-6 py-4 font-medium text-text-primary">{{ cupon.codigo }}</td>
                <td class="px-6 py-4">
                  <span class="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium"
                    [ngClass]="cupon.tipo_descuento === 'porcentaje' ? 'bg-sky-500/10 text-sky-300 border border-sky-500/20' : 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20'">
                    <lucide-icon [img]="Tag" [size]="12"></lucide-icon>
                    {{ cupon.tipo_descuento === 'porcentaje' ? 'Porcentaje' : 'Monto Fijo' }}
                  </span>
                </td>
                <td class="px-6 py-4 text-text-primary">
                  {{ cupon.tipo_descuento === 'porcentaje' ? cupon.valor + '%' : 'S/ ' + cupon.valor.toFixed(2) }}
                </td>
                <td class="px-6 py-4 text-text-secondary">
                  <span class="flex items-center gap-1.5">
                    <lucide-icon [img]="CalendarClock" [size]="12"></lucide-icon>
                    {{ cupon.fecha_expiracion | date:'short' }}
                  </span>
                </td>
                <td class="px-6 py-4">
                  <span *ngIf="!cupon.usado" class="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                    <lucide-icon [img]="CheckCircle2" [size]="12"></lucide-icon> Activo
                  </span>
                  <span *ngIf="cupon.usado" class="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium bg-red-500/10 text-red-300 border border-red-500/20">
                    <lucide-icon [img]="AlertCircle" [size]="12"></lucide-icon> Usado
                  </span>
                </td>
                <td class="px-6 py-4 text-text-secondary font-mono text-xs">
                  {{ cupon.pedido_id ? (cupon.pedido_id | slice:0:8) : '-' }}
                </td>
                <td class="px-6 py-4 text-text-secondary text-xs">
                  {{ cupon.fecha_creacion | date:'short' }}
                </td>
              </tr>
              <tr *ngIf="cupones().length === 0 && !cargando()">
                <td colspan="7" class="px-6 py-12 text-center text-text-secondary">
                  No hay cupones creados aún.
                </td>
              </tr>
              <tr *ngIf="cargando()">
                <td colspan="7" class="px-6 py-12 text-center text-text-secondary">
                  Cargando cupones...
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Paginación -->
        <div *ngIf="totalPages() > 1" class="flex items-center justify-between px-6 py-4 border-t border-border-subtle bg-bg-main/50">
          <span class="text-xs text-text-secondary">
            Página {{ paginaActual() }} de {{ totalPages() }}
          </span>
          <div class="flex items-center gap-2">
            <app-button variant="ghost" size="sm" [disabled]="paginaActual() <= 1" (onClick)="cambiarPagina(paginaActual() - 1)">
              <lucide-icon [img]="ChevronLeft" [size]="16"></lucide-icon>
            </app-button>
            <app-button variant="ghost" size="sm" [disabled]="paginaActual() >= totalPages()" (onClick)="cambiarPagina(paginaActual() + 1)">
              <lucide-icon [img]="ChevronRight" [size]="16"></lucide-icon>
            </app-button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: []
})
export class AdminCuponesComponent implements OnInit {
  private adminService = inject(AdminService);
  private fb = inject(FormBuilder);
  private toast = inject(ToastService);

  readonly Ticket = Ticket;
  readonly Plus = Plus;
  readonly X = X;
  readonly Tag = Tag;
  readonly CalendarClock = CalendarClock;
  readonly CheckCircle2 = CheckCircle2;
  readonly AlertCircle = AlertCircle;
  readonly ChevronLeft = ChevronLeft;
  readonly ChevronRight = ChevronRight;

  cupones = signal<CuponDescuento[]>([]);
  cargando = signal(false);
  guardando = signal(false);
  mostrarFormulario = signal(false);
  paginaActual = signal(1);
  totalPages = signal(0);
  pageSize = 10;

  cuponForm = this.fb.group({
    codigo: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(50)]],
    tipo_descuento: ['porcentaje', Validators.required],
    valor: [0, [Validators.required, Validators.min(1)]],
    dias_expiracion: [30, [Validators.required, Validators.min(1), Validators.max(365)]],
  });

  ngOnInit() {
    this.cargarCupones();
  }

  cargarCupones() {
    this.cargando.set(true);
    this.adminService.getCupones(this.paginaActual(), this.pageSize).subscribe({
      next: (res) => {
        this.cupones.set(res.items);
        this.totalPages.set(res.total_pages);
        this.cargando.set(false);
      },
      error: () => {
        this.cargando.set(false);
        this.toast.error('No se pudieron cargar los cupones.', 'Error');
      }
    });
  }

  toggleForm() {
    this.mostrarFormulario.update(v => !v);
    if (!this.mostrarFormulario()) {
      this.cuponForm.reset({ tipo_descuento: 'porcentaje', valor: 0, dias_expiracion: 30 });
    }
  }

  guardarCupon() {
    if (this.cuponForm.invalid) return;
    this.guardando.set(true);

    const payload: CuponCreatePayload = {
      codigo: this.cuponForm.value.codigo!.toUpperCase().trim(),
      tipo_descuento: this.cuponForm.value.tipo_descuento as 'porcentaje' | 'monto_fijo',
      valor: Number(this.cuponForm.value.valor),
      dias_expiracion: Number(this.cuponForm.value.dias_expiracion),
    };

    this.adminService.createCupon(payload).subscribe({
      next: (nuevo) => {
        this.cupones.update(lista => [nuevo, ...lista]);
        this.guardando.set(false);
        this.mostrarFormulario.set(false);
        this.cuponForm.reset({ tipo_descuento: 'porcentaje', valor: 0, dias_expiracion: 30 });
        this.toast.success(`Cupón ${nuevo.codigo} creado correctamente.`, 'Cupón Creado');
      },
      error: (err) => {
        this.guardando.set(false);
        const msg = err?.error?.detail || 'No se pudo crear el cupón.';
        this.toast.error(msg, 'Error');
      }
    });
  }

  cambiarPagina(pagina: number) {
    if (pagina < 1 || pagina > this.totalPages()) return;
    this.paginaActual.set(pagina);
    this.cargarCupones();
  }
}
