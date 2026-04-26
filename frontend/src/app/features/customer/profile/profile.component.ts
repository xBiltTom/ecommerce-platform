import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { LucideAngularModule, User, ShoppingBag, Eye, X, Loader, AlertCircle, ChevronLeft, ChevronRight, ShieldCheck, KeyRound } from 'lucide-angular';
import { AuthService, Usuario } from '../../../core/services/auth.service';
import {
  CheckoutService,
  EstadoPedido,
  PedidoDetalle,
  PedidoHistorialItem,
} from '../../../core/services/checkout.service';
import { ToastService } from '../../../core/services/toast.service';
import { ButtonComponent } from '../../../shared/components/button/button.component';
import { InputComponent } from '../../../shared/components/input/input.component';

type ProfileSection = 'datos' | 'pedidos';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    LucideAngularModule,
    ButtonComponent,
    InputComponent,
  ],
  template: `
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <section class="relative overflow-hidden rounded-card border border-border-subtle bg-bg-surface">
        <div class="absolute inset-0 bg-[radial-gradient(circle_at_15%_0%,rgba(223,227,29,0.16),transparent_45%)]"></div>
        <div class="absolute -right-20 -top-16 w-72 h-72 border border-accent-primary/20 rounded-full"></div>
        <div class="absolute right-12 bottom-6 text-[10px] uppercase tracking-[0.35em] text-text-secondary/60">Member Control Center</div>

        <div class="relative p-8 md:p-10 lg:p-12">
          <p class="text-xs uppercase tracking-[0.3em] text-text-secondary mb-3">Area Cliente</p>
          <h1 class="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight leading-none max-w-4xl">
            Tu cuenta, tus pedidos, tu control total.
          </h1>
          <p class="text-text-secondary mt-5 max-w-2xl leading-relaxed">
            Actualiza tus datos personales y sigue el estado de cada pedido desde un solo panel operativo.
          </p>
        </div>
      </section>

      <div class="mt-8 grid grid-cols-1 xl:grid-cols-[320px_1fr] gap-8">
        <aside class="space-y-5">
          <div class="rounded-card border border-border-subtle bg-bg-surface p-6">
            <div class="w-16 h-16 rounded-full bg-accent-primary text-text-inverse flex items-center justify-center text-xl font-black tracking-tight">
              {{ userInitials() }}
            </div>

            <div class="mt-4">
              <p class="text-lg font-bold leading-tight">
                {{ currentUser()?.nombre }} {{ currentUser()?.apellido }}
              </p>
              <p class="text-sm text-text-secondary break-all mt-1">{{ currentUser()?.email }}</p>
            </div>

            <div class="mt-6 space-y-2">
              <div class="flex items-center justify-between text-xs uppercase tracking-[0.18em] text-text-secondary">
                <span>Perfil completado</span>
                <span>{{ profileCompletionPercentage() }}%</span>
              </div>
              <div class="h-2 rounded-full bg-bg-main overflow-hidden">
                <div class="h-full bg-accent-primary transition-all duration-300" [style.width.%]="profileCompletionPercentage()"></div>
              </div>
            </div>

            <div class="mt-6 pt-5 border-t border-border-subtle text-xs text-text-secondary space-y-2">
              <p>
                <span class="uppercase tracking-[0.16em]">Cliente ID</span>
              </p>
              <p class="font-semibold text-text-primary text-sm break-all">{{ currentUser()?.id }}</p>
            </div>
          </div>

          <div class="rounded-card border border-border-subtle bg-bg-surface p-3 space-y-2">
            <button
              type="button"
              class="w-full px-4 py-3 rounded-sm text-left flex items-center gap-3 transition-colors"
              [ngClass]="activeSection() === 'datos' ? 'bg-accent-primary text-text-inverse font-semibold' : 'text-text-secondary hover:text-text-primary hover:bg-bg-main'"
              (click)="setSection('datos')"
            >
              <lucide-icon [img]="User" [size]="16"></lucide-icon>
              Datos personales
            </button>

            <button
              type="button"
              class="w-full px-4 py-3 rounded-sm text-left flex items-center gap-3 transition-colors"
              [ngClass]="activeSection() === 'pedidos' ? 'bg-accent-primary text-text-inverse font-semibold' : 'text-text-secondary hover:text-text-primary hover:bg-bg-main'"
              (click)="setSection('pedidos')"
            >
              <lucide-icon [img]="ShoppingBag" [size]="16"></lucide-icon>
              Historial de pedidos
            </button>
          </div>
        </aside>

        <section class="space-y-6">
          <article *ngIf="activeSection() === 'datos'" class="rounded-card border border-border-subtle bg-bg-surface p-6 md:p-8">
            <div class="flex items-center justify-between gap-4 mb-6">
              <div>
                <h2 class="text-2xl font-bold tracking-tight">Datos de la cuenta</h2>
                <p class="text-sm text-text-secondary mt-1">Mantén tu información actualizada para una mejor experiencia de compra.</p>
              </div>

              <span *ngIf="loadingProfile()" class="inline-flex items-center gap-2 text-xs text-text-secondary uppercase tracking-[0.16em]">
                <lucide-icon [img]="Loader" [size]="14" class="animate-spin"></lucide-icon>
                Cargando
              </span>
            </div>

            <form [formGroup]="profileForm" (ngSubmit)="saveProfile()" class="space-y-5">
              <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
                <app-input
                  id="profile_nombre"
                  label="Nombre"
                  placeholder="Tu nombre"
                  formControlName="nombre"
                  [error]="profileSubmitted() && profileForm.controls.nombre.invalid ? 'Nombre obligatorio' : ''"
                ></app-input>

                <app-input
                  id="profile_apellido"
                  label="Apellido"
                  placeholder="Tu apellido"
                  formControlName="apellido"
                  [error]="profileSubmitted() && profileForm.controls.apellido.invalid ? 'Apellido obligatorio' : ''"
                ></app-input>
              </div>

              <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
                <app-input
                  id="profile_email"
                  label="Correo"
                  type="email"
                  placeholder="tu@email.com"
                  formControlName="email"
                  [error]="profileSubmitted() && profileForm.controls.email.invalid ? emailErrorText() : ''"
                ></app-input>

                <app-input
                  id="profile_telefono"
                  label="Telefono"
                  placeholder="+51 999 999 999"
                  formControlName="telefono"
                ></app-input>
              </div>

              <div class="pt-4 border-t border-border-subtle flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <p class="text-xs uppercase tracking-[0.14em] text-text-secondary">
                  Último acceso: {{ currentUser()?.fecha_creacion ? formatDate(currentUser()?.fecha_creacion) : 'No disponible' }}
                </p>

                <app-button
                  variant="primary"
                  size="md"
                  type="submit"
                  [disabled]="savingProfile()"
                >
                  <span class="inline-flex items-center gap-2">
                    <lucide-icon *ngIf="savingProfile()" [img]="Loader" [size]="16" class="animate-spin"></lucide-icon>
                    {{ savingProfile() ? 'Guardando...' : 'Guardar cambios' }}
                  </span>
                </app-button>
              </div>
            </form>

            <div class="mt-8 pt-6 border-t border-border-subtle">
              <div class="flex items-center gap-2 text-text-primary mb-5">
                <lucide-icon [img]="KeyRound" [size]="18"></lucide-icon>
                <h3 class="text-xl font-bold tracking-tight">Seguridad de acceso</h3>
              </div>

              <form [formGroup]="passwordForm" (ngSubmit)="changePassword()" class="space-y-4">
                <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <app-input
                    id="current_password"
                    label="Contraseña actual"
                    type="password"
                    placeholder="********"
                    formControlName="current_password"
                    [error]="passwordSubmitted() && passwordForm.controls.current_password.invalid ? 'Ingresa tu contraseña actual' : ''"
                  ></app-input>

                  <app-input
                    id="new_password"
                    label="Nueva contraseña"
                    type="password"
                    placeholder="Minimo 8 caracteres"
                    formControlName="new_password"
                    [error]="passwordSubmitted() && passwordForm.controls.new_password.invalid ? 'Minimo 8 caracteres' : ''"
                  ></app-input>

                  <app-input
                    id="confirm_password"
                    label="Confirmar contraseña"
                    type="password"
                    placeholder="Repite la nueva contraseña"
                    formControlName="confirm_password"
                    [error]="passwordSubmitted() && passwordForm.controls.confirm_password.invalid ? 'Confirma la contraseña' : ''"
                  ></app-input>
                </div>

                <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2">
                  <p class="text-xs uppercase tracking-[0.14em] text-text-secondary inline-flex items-center gap-2">
                    <lucide-icon [img]="ShieldCheck" [size]="14"></lucide-icon>
                    Protege tu cuenta con una clave única
                  </p>

                  <app-button variant="secondary" size="sm" type="submit" [disabled]="savingPassword()">
                    <span class="inline-flex items-center gap-2">
                      <lucide-icon *ngIf="savingPassword()" [img]="Loader" [size]="14" class="animate-spin"></lucide-icon>
                      {{ savingPassword() ? 'Actualizando...' : 'Actualizar contraseña' }}
                    </span>
                  </app-button>
                </div>
              </form>
            </div>
          </article>

          <article *ngIf="activeSection() === 'pedidos'" class="rounded-card border border-border-subtle bg-bg-surface p-6 md:p-8 space-y-6">
            <div class="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
              <div>
                <h2 class="text-2xl font-bold tracking-tight">Historial de pedidos</h2>
                <p class="text-sm text-text-secondary mt-1">Consulta estado, total y detalle de cada compra realizada.</p>
              </div>

              <app-button variant="secondary" size="sm" [disabled]="ordersLoading()" (onClick)="loadPedidos(page())">
                Actualizar
              </app-button>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div class="rounded-sm border border-border-subtle bg-bg-main/70 px-4 py-3">
                <p class="text-xs uppercase tracking-[0.18em] text-text-secondary">Total pedidos</p>
                <p class="text-2xl font-black mt-1">{{ totalPedidos() }}</p>
              </div>
              <div class="rounded-sm border border-border-subtle bg-bg-main/70 px-4 py-3">
                <p class="text-xs uppercase tracking-[0.18em] text-text-secondary">Pendientes</p>
                <p class="text-2xl font-black mt-1 text-amber-300">{{ pedidosPendientes() }}</p>
              </div>
              <div class="rounded-sm border border-border-subtle bg-bg-main/70 px-4 py-3">
                <p class="text-xs uppercase tracking-[0.18em] text-text-secondary">Entregados</p>
                <p class="text-2xl font-black mt-1 text-emerald-300">{{ pedidosEntregados() }}</p>
              </div>
            </div>

            <div *ngIf="ordersLoading()" class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div *ngFor="let i of [1, 2, 3, 4]" class="h-40 rounded-card border border-border-subtle bg-bg-main/70 animate-pulse"></div>
            </div>

            <div *ngIf="!ordersLoading() && pedidos().length === 0" class="rounded-card border border-border-subtle bg-bg-main/70 p-8 text-center">
              <div class="w-14 h-14 rounded-full bg-bg-surface border border-border-subtle flex items-center justify-center mx-auto mb-4 text-text-secondary">
                <lucide-icon [img]="ShoppingBag" [size]="20"></lucide-icon>
              </div>
              <p class="text-lg font-semibold">Aún no tienes pedidos registrados</p>
              <p class="text-sm text-text-secondary mt-2">Cuando completes una compra, aparecerá aquí con su estado en tiempo real.</p>
            </div>

            <div *ngIf="!ordersLoading() && pedidos().length > 0" class="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <article *ngFor="let pedido of pedidos(); trackBy: trackByPedidoId" class="rounded-card border border-border-subtle bg-bg-main/65 p-5">
                <div class="flex items-start justify-between gap-4">
                  <div>
                    <p class="text-xs uppercase tracking-[0.16em] text-text-secondary">Pedido</p>
                    <p class="text-lg font-black mt-1">#{{ shortId(pedido.id) }}</p>
                    <p class="text-xs text-text-secondary mt-1">{{ formatDate(pedido.fecha_creacion) }}</p>
                  </div>

                  <span class="inline-flex px-2.5 py-1 rounded-pill text-xs font-semibold" [ngClass]="estadoBadge(pedido.estado)">
                    {{ estadoLabel(pedido.estado) }}
                  </span>
                </div>

                <div class="mt-5 grid grid-cols-2 gap-3 text-sm">
                  <div class="rounded-sm border border-border-subtle px-3 py-2">
                    <p class="text-xs uppercase tracking-[0.14em] text-text-secondary">Items</p>
                    <p class="font-semibold mt-1">{{ pedido.total_items }}</p>
                  </div>

                  <div class="rounded-sm border border-border-subtle px-3 py-2">
                    <p class="text-xs uppercase tracking-[0.14em] text-text-secondary">Total</p>
                    <p class="font-semibold mt-1">{{ pedido.total | currency:'PEN':'S/ ' }}</p>
                  </div>
                </div>

                <div class="mt-5 flex flex-wrap items-center gap-2">
                  <app-button variant="secondary" size="sm" (onClick)="openPedidoDetalle(pedido.id)">
                    <span class="inline-flex items-center gap-1.5">
                      <lucide-icon [img]="Eye" [size]="14"></lucide-icon>
                      Ver detalle
                    </span>
                  </app-button>

                  <app-button
                    *ngIf="canCancel(pedido.estado)"
                    variant="ghost"
                    size="sm"
                    [disabled]="cancelingPedidoId() === pedido.id"
                    (onClick)="cancelPedido(pedido.id)"
                  >
                    <span class="inline-flex items-center gap-1.5">
                      <lucide-icon *ngIf="cancelingPedidoId() === pedido.id" [img]="Loader" [size]="14" class="animate-spin"></lucide-icon>
                      {{ cancelingPedidoId() === pedido.id ? 'Cancelando...' : 'Cancelar pedido' }}
                    </span>
                  </app-button>
                </div>
              </article>
            </div>

            <div *ngIf="!ordersLoading() && totalPages() > 1" class="pt-2 flex items-center justify-between">
              <p class="text-xs uppercase tracking-[0.16em] text-text-secondary">
                Pagina {{ page() }} de {{ totalPages() }}
              </p>

              <div class="flex items-center gap-2">
                <button
                  type="button"
                  class="w-9 h-9 rounded-sm border border-border-subtle text-text-secondary hover:text-text-primary hover:bg-bg-main transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  [disabled]="page() <= 1 || ordersLoading()"
                  (click)="changePage(page() - 1)"
                  aria-label="Página anterior"
                >
                  <lucide-icon [img]="ChevronLeft" [size]="16"></lucide-icon>
                </button>

                <button
                  type="button"
                  class="w-9 h-9 rounded-sm border border-border-subtle text-text-secondary hover:text-text-primary hover:bg-bg-main transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  [disabled]="page() >= totalPages() || ordersLoading()"
                  (click)="changePage(page() + 1)"
                  aria-label="Página siguiente"
                >
                  <lucide-icon [img]="ChevronRight" [size]="16"></lucide-icon>
                </button>
              </div>
            </div>
          </article>
        </section>
      </div>

      <div *ngIf="isPedidoModalOpen()" class="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm p-4 flex items-center justify-center">
        <div class="w-full max-w-4xl max-h-[90vh] rounded-card border border-border-subtle bg-bg-surface shadow-2xl flex flex-col overflow-hidden">
          <header class="px-5 py-4 border-b border-border-subtle flex items-start justify-between gap-4 bg-bg-main/70">
            <div>
              <p class="text-xs uppercase tracking-[0.18em] text-text-secondary">Detalle de pedido</p>
              <h3 class="text-xl font-bold mt-1">
                #{{ selectedPedidoId() ? shortId(selectedPedidoId()!) : '-' }}
              </h3>
            </div>

            <button
              type="button"
              class="w-9 h-9 rounded-sm border border-border-subtle text-text-secondary hover:text-text-primary hover:bg-bg-main transition-colors"
              (click)="closePedidoModal()"
              aria-label="Cerrar modal"
            >
              <lucide-icon [img]="X" [size]="16"></lucide-icon>
            </button>
          </header>

          <div class="p-5 overflow-y-auto space-y-5">
            <div *ngIf="loadingPedidoDetalle()" class="space-y-4">
              <div class="h-8 rounded-sm bg-bg-main animate-pulse"></div>
              <div class="h-48 rounded-sm bg-bg-main animate-pulse"></div>
              <div class="h-24 rounded-sm bg-bg-main animate-pulse"></div>
            </div>

            <ng-container *ngIf="!loadingPedidoDetalle() && selectedPedido() as pedido">
              <div class="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                <div class="rounded-sm border border-border-subtle p-3">
                  <p class="text-xs uppercase tracking-[0.14em] text-text-secondary">Estado</p>
                  <span class="inline-flex mt-2 px-2.5 py-1 rounded-pill text-xs font-semibold" [ngClass]="estadoBadge(pedido.estado)">
                    {{ estadoLabel(pedido.estado) }}
                  </span>
                </div>

                <div class="rounded-sm border border-border-subtle p-3">
                  <p class="text-xs uppercase tracking-[0.14em] text-text-secondary">Fecha</p>
                  <p class="font-semibold mt-2">{{ formatDate(pedido.fecha_creacion) }}</p>
                </div>

                <div class="rounded-sm border border-border-subtle p-3">
                  <p class="text-xs uppercase tracking-[0.14em] text-text-secondary">Total</p>
                  <p class="font-semibold mt-2">{{ pedido.total | currency:'PEN':'S/ ' }}</p>
                </div>
              </div>

              <div class="rounded-card border border-border-subtle overflow-hidden">
                <table class="w-full text-left text-sm min-w-[620px]">
                  <thead class="bg-bg-main border-b border-border-subtle text-[11px] uppercase tracking-[0.14em] text-text-secondary">
                    <tr>
                      <th class="px-3 py-2">Producto</th>
                      <th class="px-3 py-2">SKU</th>
                      <th class="px-3 py-2 text-right">Cant.</th>
                      <th class="px-3 py-2 text-right">Precio</th>
                      <th class="px-3 py-2 text-right">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-border-subtle">
                    <tr *ngFor="let item of pedido.items; trackBy: trackByPedidoItemId" class="hover:bg-bg-main/45">
                      <td class="px-3 py-2 font-medium">{{ item.nombre_producto }}</td>
                      <td class="px-3 py-2 text-text-secondary">{{ item.sku_producto }}</td>
                      <td class="px-3 py-2 text-right">{{ item.cantidad }}</td>
                      <td class="px-3 py-2 text-right">{{ item.precio_unitario | currency:'PEN':'S/ ' }}</td>
                      <td class="px-3 py-2 text-right font-semibold">{{ item.subtotal | currency:'PEN':'S/ ' }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div class="rounded-card border border-border-subtle bg-bg-main/60 p-4">
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p class="text-xs uppercase tracking-[0.14em] text-text-secondary">Enviado a</p>
                    <p class="font-medium mt-2">{{ pedido.nombre_destinatario }}</p>
                    <p class="text-sm text-text-secondary mt-1">{{ pedido.direccion_envio }}</p>
                    <p class="text-sm text-text-secondary">{{ pedido.ciudad_envio }}, {{ pedido.pais_envio }}</p>
                  </div>

                  <div class="md:text-right space-y-1">
                    <p class="text-sm text-text-secondary">Subtotal: <span class="text-text-primary">{{ pedido.subtotal | currency:'PEN':'S/ ' }}</span></p>
                    <p class="text-sm text-text-secondary">Descuento: <span class="text-text-primary">{{ pedido.descuento | currency:'PEN':'S/ ' }}</span></p>
                    <p class="text-sm text-text-secondary">Envio: <span class="text-text-primary">{{ pedido.costo_envio | currency:'PEN':'S/ ' }}</span></p>
                    <p class="text-lg font-bold pt-2">Total: {{ pedido.total | currency:'PEN':'S/ ' }}</p>
                  </div>
                </div>
              </div>

              <div *ngIf="canCancel(pedido.estado)" class="pt-2 flex justify-end">
                <app-button
                  variant="ghost"
                  size="sm"
                  [disabled]="cancelingPedidoId() === pedido.id"
                  (onClick)="cancelPedido(pedido.id)"
                >
                  <span class="inline-flex items-center gap-1.5">
                    <lucide-icon *ngIf="cancelingPedidoId() === pedido.id" [img]="Loader" [size]="14" class="animate-spin"></lucide-icon>
                    {{ cancelingPedidoId() === pedido.id ? 'Cancelando...' : 'Cancelar este pedido' }}
                  </span>
                </app-button>
              </div>
            </ng-container>

            <div *ngIf="!loadingPedidoDetalle() && !selectedPedido()" class="rounded-card border border-rose-500/30 bg-rose-500/10 p-6 text-center text-rose-200">
              <lucide-icon [img]="AlertCircle" [size]="20" class="mx-auto mb-2"></lucide-icon>
              No se pudo cargar el detalle del pedido.
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [],
})
export class ProfileComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly checkoutService = inject(CheckoutService);
  private readonly toast = inject(ToastService);
  private readonly fb = inject(FormBuilder);

  readonly User = User;
  readonly ShoppingBag = ShoppingBag;
  readonly Eye = Eye;
  readonly X = X;
  readonly Loader = Loader;
  readonly AlertCircle = AlertCircle;
  readonly ChevronLeft = ChevronLeft;
  readonly ChevronRight = ChevronRight;
  readonly ShieldCheck = ShieldCheck;
  readonly KeyRound = KeyRound;

  readonly activeSection = signal<ProfileSection>('datos');
  readonly loadingProfile = signal(false);
  readonly savingProfile = signal(false);
  readonly profileSubmitted = signal(false);
  readonly savingPassword = signal(false);
  readonly passwordSubmitted = signal(false);

  readonly ordersLoading = signal(false);
  readonly pedidos = signal<PedidoHistorialItem[]>([]);
  readonly page = signal(1);
  readonly total = signal(0);
  readonly totalPages = signal(0);
  readonly pageSize = signal(6);

  readonly isPedidoModalOpen = signal(false);
  readonly selectedPedidoId = signal<string | null>(null);
  readonly selectedPedido = signal<PedidoDetalle | null>(null);
  readonly loadingPedidoDetalle = signal(false);
  readonly cancelingPedidoId = signal<string | null>(null);

  readonly currentUser = this.authService.currentUser;
  readonly userInitials = computed(() => {
    const user = this.currentUser();
    if (!user) {
      return 'CL';
    }

    const nombre = user.nombre?.trim() ?? '';
    const apellido = user.apellido?.trim() ?? '';

    const first = nombre.charAt(0).toUpperCase();
    const second = apellido.charAt(0).toUpperCase();
    return `${first}${second}` || 'CL';
  });

  readonly profileForm = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email, Validators.maxLength(255)]],
    nombre: ['', [Validators.required, Validators.maxLength(100)]],
    apellido: ['', [Validators.required, Validators.maxLength(100)]],
    telefono: ['', [Validators.maxLength(30)]],
  });

  readonly passwordForm = this.fb.nonNullable.group({
    current_password: ['', [Validators.required, Validators.minLength(8)]],
    new_password: ['', [Validators.required, Validators.minLength(8)]],
    confirm_password: ['', [Validators.required, Validators.minLength(8)]],
  });

  ngOnInit(): void {
    this.loadProfile();
    this.loadPedidos(1);
  }

  setSection(section: ProfileSection): void {
    this.activeSection.set(section);
  }

  loadProfile(): void {
    const cached = this.currentUser();
    if (cached) {
      this.patchProfileForm(cached);
    }

    this.loadingProfile.set(true);
    this.authService.fetchCurrentUser(true).subscribe({
      next: (user) => {
        this.patchProfileForm(user);
        this.loadingProfile.set(false);
      },
      error: () => {
        this.loadingProfile.set(false);
      },
    });
  }

  saveProfile(): void {
    this.profileSubmitted.set(true);

    if (this.profileForm.invalid) {
      this.profileForm.markAllAsTouched();
      return;
    }

    const value = this.profileForm.getRawValue();
    const payload = {
      email: value.email.trim().toLowerCase(),
      nombre: value.nombre.trim(),
      apellido: value.apellido.trim(),
      telefono: value.telefono.trim() || undefined,
    };

    this.savingProfile.set(true);
    this.authService.updateProfile(payload).subscribe({
      next: (user) => {
        this.patchProfileForm(user);
        this.profileForm.markAsPristine();
        this.savingProfile.set(false);
        this.toast.success('Tus datos se actualizaron correctamente.', 'Perfil actualizado');
      },
      error: () => {
        this.savingProfile.set(false);
      },
    });
  }

  changePassword(): void {
    this.passwordSubmitted.set(true);

    if (this.passwordForm.invalid) {
      this.passwordForm.markAllAsTouched();
      return;
    }

    const value = this.passwordForm.getRawValue();
    if (value.new_password !== value.confirm_password) {
      this.toast.warning('La nueva contraseña y la confirmación no coinciden.', 'Seguridad');
      return;
    }

    this.savingPassword.set(true);
    this.authService.changePassword({
      current_password: value.current_password,
      new_password: value.new_password,
    }).subscribe({
      next: (response) => {
        this.savingPassword.set(false);
        this.passwordForm.reset({
          current_password: '',
          new_password: '',
          confirm_password: '',
        });
        this.passwordSubmitted.set(false);
        this.toast.success(response.message || 'Contraseña actualizada correctamente.', 'Seguridad');
      },
      error: () => {
        this.savingPassword.set(false);
      },
    });
  }

  loadPedidos(page: number): void {
    this.ordersLoading.set(true);
    this.checkoutService.getPedidos(page, this.pageSize()).subscribe({
      next: (response) => {
        this.pedidos.set(response.items);
        this.page.set(response.page);
        this.total.set(response.total);
        this.totalPages.set(response.total_pages);
        this.ordersLoading.set(false);
      },
      error: () => {
        this.ordersLoading.set(false);
        this.pedidos.set([]);
        this.total.set(0);
        this.totalPages.set(0);
      },
    });
  }

  changePage(nextPage: number): void {
    if (nextPage < 1 || (this.totalPages() > 0 && nextPage > this.totalPages())) {
      return;
    }

    this.loadPedidos(nextPage);
  }

  openPedidoDetalle(pedidoId: string): void {
    this.isPedidoModalOpen.set(true);
    this.selectedPedidoId.set(pedidoId);
    this.selectedPedido.set(null);
    this.loadingPedidoDetalle.set(true);

    this.checkoutService.getPedidoDetalle(pedidoId).subscribe({
      next: (pedido) => {
        this.selectedPedido.set(pedido);
        this.loadingPedidoDetalle.set(false);
      },
      error: () => {
        this.loadingPedidoDetalle.set(false);
      },
    });
  }

  closePedidoModal(): void {
    this.isPedidoModalOpen.set(false);
    this.selectedPedidoId.set(null);
    this.selectedPedido.set(null);
    this.loadingPedidoDetalle.set(false);
  }

  cancelPedido(pedidoId: string): void {
    const confirmCancel = window.confirm('¿Seguro que deseas cancelar este pedido? Esta accion no se puede deshacer.');
    if (!confirmCancel) {
      return;
    }

    this.cancelingPedidoId.set(pedidoId);
    this.checkoutService.cancelarPedido(pedidoId).subscribe({
      next: () => {
        this.cancelingPedidoId.set(null);

        this.pedidos.update((list) =>
          list.map((pedido) =>
            pedido.id === pedidoId
              ? {
                  ...pedido,
                  estado: 'cancelado',
                }
              : pedido
          )
        );

        this.selectedPedido.update((pedido) =>
          pedido && pedido.id === pedidoId
            ? {
                ...pedido,
                estado: 'cancelado',
              }
            : pedido
        );

        this.toast.success('Tu pedido fue cancelado correctamente.', 'Pedido cancelado');
      },
      error: () => {
        this.cancelingPedidoId.set(null);
      },
    });
  }

  canCancel(estado: EstadoPedido): boolean {
    return estado === 'pendiente';
  }

  estadoLabel(estado: EstadoPedido): string {
    switch (estado) {
      case 'en_preparacion':
        return 'En preparacion';
      case 'pendiente':
        return 'Pendiente';
      case 'pagado':
        return 'Pagado';
      case 'enviado':
        return 'Enviado';
      case 'entregado':
        return 'Entregado';
      case 'cancelado':
        return 'Cancelado';
      default:
        return estado;
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

  formatDate(value: string | undefined): string {
    if (!value) {
      return 'No disponible';
    }

    return new Intl.DateTimeFormat('es-PE', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(value));
  }

  totalPedidos(): number {
    return this.total();
  }

  pedidosPendientes(): number {
    return this.pedidos().filter((pedido) => pedido.estado === 'pendiente').length;
  }

  pedidosEntregados(): number {
    return this.pedidos().filter((pedido) => pedido.estado === 'entregado').length;
  }

  profileCompletionPercentage(): number {
    const values = this.profileForm.getRawValue();
    const fields = [values.email, values.nombre, values.apellido, values.telefono];
    const completed = fields.filter((field) => field.trim().length > 0).length;
    return Math.round((completed / fields.length) * 100);
  }

  emailErrorText(): string {
    const control = this.profileForm.controls.email;
    if (control.hasError('required')) {
      return 'Correo obligatorio';
    }
    if (control.hasError('email')) {
      return 'Ingresa un correo válido';
    }
    return 'Correo inválido';
  }

  trackByPedidoId(index: number, pedido: PedidoHistorialItem): string {
    return pedido.id;
  }

  trackByPedidoItemId(index: number, item: { id: number }): number {
    return item.id;
  }

  private patchProfileForm(user: Usuario): void {
    this.profileForm.patchValue({
      email: user.email ?? '',
      nombre: user.nombre ?? '',
      apellido: user.apellido ?? '',
      telefono: user.telefono ?? '',
    });
  }
}
