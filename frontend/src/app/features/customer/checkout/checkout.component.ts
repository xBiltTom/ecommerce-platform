import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import {
  BadgeCheck,
  CheckCircle,
  CreditCard,
  LoaderCircle,
  LucideAngularModule,
  MapPin,
  ShieldCheck,
  WalletCards,
} from 'lucide-angular';
import { CartService } from '../../../core/services/cart.service';
import {
  CheckoutService,
  Direccion,
  PagoResumen,
  PedidoDetalle,
  StripeCheckoutResponse,
} from '../../../core/services/checkout.service';
import { ToastService } from '../../../core/services/toast.service';
import { ButtonComponent } from '../../../shared/components/button/button.component';
import { InputComponent } from '../../../shared/components/input/input.component';

type PaymentStage = 'idle' | 'authorizing' | 'capturing' | 'success' | 'error';

@Component({
  selector: 'app-checkout',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, ReactiveFormsModule, ButtonComponent, InputComponent, LucideAngularModule],
  template: `
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div class="mb-10">
        <h1 class="text-3xl font-bold text-text-primary tracking-tight">Finalizar Compra</h1>
        <p class="text-text-secondary">Confirma tu pedido y completa el pago desde Stripe Checkout.</p>
      </div>

      <section *ngIf="pedidoExitoso() && pedidoConfirmado() as pedido" class="max-w-3xl mx-auto rounded-card border border-emerald-400/35 bg-[radial-gradient(circle_at_top,#224733,transparent_46%),linear-gradient(135deg,#0b1512,#101d16)] p-8 text-white shadow-[0_24px_80px_rgba(0,0,0,0.32)]">
        <div class="inline-flex items-center gap-2 rounded-full border border-emerald-300/30 bg-emerald-300/10 px-4 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-emerald-100">
          <lucide-icon [img]="BadgeCheck" [size]="16"></lucide-icon> Pago confirmado con Stripe
        </div>
        <h2 class="mt-6 text-3xl font-black tracking-tight">Pedido confirmado y pago registrado</h2>
        <p class="mt-3 text-sm text-emerald-50/80">Stripe confirmó la transacción y el pago quedó registrado en la base de datos.</p>
        <div class="mt-8 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div class="rounded-2xl border border-white/10 bg-white/5 p-4">
            <p class="text-xs uppercase tracking-[0.2em] text-emerald-100/70">Pedido</p>
            <p class="mt-2 text-2xl font-black">#{{ shortId(pedido.id) }}</p>
            <p class="mt-2 text-sm text-emerald-50/75" *ngIf="pedido.descuento > 0">Subtotal {{ pedido.subtotal | currency:'PEN':'S/ ' }}</p>
            <p class="mt-1 text-sm text-emerald-300 font-semibold" *ngIf="pedido.descuento > 0">Descuento -{{ pedido.descuento | currency:'PEN':'S/ ' }}</p>
            <p class="mt-2 text-sm text-emerald-50/75 font-semibold">Total {{ pedido.total | currency:'PEN':'S/ ' }}</p>
          </div>
          <div class="rounded-2xl border border-white/10 bg-white/5 p-4">
            <p class="text-xs uppercase tracking-[0.2em] text-emerald-100/70">Referencia</p>
            <p class="mt-2 text-lg font-bold break-all">{{ pedido.pago?.referencia_externa || 'STRIPE-PENDING' }}</p>
            <p class="mt-2 text-sm text-emerald-50/75">{{ pedido.pago?.pasarela || 'Stripe Checkout' }}</p>
          </div>
        </div>
        <div class="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div class="rounded-2xl border border-white/10 bg-white/5 p-4"><p class="text-[11px] uppercase tracking-[0.18em] text-emerald-100/70">Método</p><p class="mt-2 font-semibold">{{ humanMetodo(pedido.pago?.metodo) }}</p></div>
          <div class="rounded-2xl border border-white/10 bg-white/5 p-4"><p class="text-[11px] uppercase tracking-[0.18em] text-emerald-100/70">Autorización</p><p class="mt-2 font-semibold">{{ pedido.pago?.codigo_autorizacion || 'Aprobado' }}</p></div>
          <div class="rounded-2xl border border-white/10 bg-white/5 p-4"><p class="text-[11px] uppercase tracking-[0.18em] text-emerald-100/70">Estado</p><p class="mt-2 font-semibold capitalize">{{ pedido.pago?.estado || pedido.estado }}</p></div>
        </div>
        <div class="mt-6 rounded-2xl border border-white/10 bg-black/15 p-4 text-sm text-emerald-50/80">{{ pedido.pago?.resumen || 'La transacción fue capturada correctamente por Stripe Checkout.' }}</div>
        <div class="mt-8 flex flex-col sm:flex-row gap-4">
          <app-button variant="primary" routerLink="/">Volver al catálogo</app-button>
          <app-button variant="secondary" routerLink="/mi-perfil">Ver mi pedido</app-button>
        </div>
      </section>

      <div *ngIf="!pedidoExitoso()" class="grid grid-cols-1 lg:grid-cols-3 gap-10">
        <div class="lg:col-span-2 space-y-8">
          <section class="bg-bg-surface p-6 rounded-card border border-border-subtle">
            <h3 class="text-xl font-bold text-text-primary mb-6 flex items-center gap-2"><lucide-icon [img]="MapPin" [size]="20" class="text-accent-primary"></lucide-icon> Dirección de Envío</h3>
            <div *ngIf="direcciones().length > 0 && !mostrarFormularioDireccion()" class="space-y-4">
              <div *ngFor="let dir of direcciones()" (click)="seleccionarDireccion(dir.id)" class="p-4 border rounded-sm cursor-pointer transition-all duration-200" [ngClass]="direccionSeleccionada() === dir.id ? 'border-accent-primary bg-accent-primary/5' : 'border-border-subtle hover:border-text-secondary'">
                <div class="flex justify-between items-start">
                  <div><h4 class="font-bold text-text-primary">{{ dir.titulo }}</h4><p class="text-text-secondary text-sm">{{ dir.direccion }}</p><p class="text-text-secondary text-sm">{{ dir.ciudad }}, {{ dir.pais }}</p></div>
                  <div *ngIf="direccionSeleccionada() === dir.id" class="w-5 h-5 rounded-full bg-accent-primary flex items-center justify-center text-bg-main"><lucide-icon [img]="CheckCircle" [size]="14"></lucide-icon></div>
                </div>
              </div>
              <app-button variant="ghost" (onClick)="mostrarFormularioDireccion.set(true)" class="mt-4">+ Agregar nueva dirección</app-button>
            </div>
            <form *ngIf="direcciones().length === 0 || mostrarFormularioDireccion()" [formGroup]="direccionForm" (ngSubmit)="guardarDireccion()" class="space-y-4 mt-4">
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <app-input label="Título" formControlName="titulo" id="titulo"></app-input>
                <app-input label="Ciudad" formControlName="ciudad" id="ciudad"></app-input>
              </div>
              <app-input label="Dirección Completa" formControlName="direccion" id="direccion"></app-input>
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <app-input label="País" formControlName="pais" id="pais"></app-input>
                <app-input label="Código Postal" formControlName="codigo_postal" id="codigo_postal"></app-input>
              </div>
              <div class="flex gap-4 pt-2">
                <app-button type="button" variant="secondary" *ngIf="direcciones().length > 0" (onClick)="mostrarFormularioDireccion.set(false)">Cancelar</app-button>
                <app-button type="submit" variant="primary" [disabled]="direccionForm.invalid || loadingDireccion()">{{ loadingDireccion() ? 'Guardando...' : 'Guardar Dirección' }}</app-button>
              </div>
            </form>
          </section>

          <section class="relative overflow-hidden rounded-card border border-border-subtle bg-bg-surface p-6">
            <div class="absolute inset-0 opacity-60 bg-[radial-gradient(circle_at_top_right,rgba(223,227,29,0.08),transparent_35%),linear-gradient(160deg,transparent,rgba(255,255,255,0.02))]"></div>
            <div class="relative">
              <div class="flex flex-wrap items-start justify-between gap-4 mb-6">
                <div>
                  <h3 class="text-xl font-bold text-text-primary flex items-center gap-2"><lucide-icon [img]="WalletCards" [size]="20" class="text-accent-primary"></lucide-icon> Stripe Checkout</h3>
                  <p class="text-text-secondary text-sm mt-2">Serás redirigido a Stripe Checkout en modo prueba para completar el pago.</p>
                </div>
                <div class="inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-xs font-semibold text-emerald-300"><lucide-icon [img]="ShieldCheck" [size]="14"></lucide-icon> Entorno de prueba</div>
              </div>

              <div class="grid grid-cols-1 gap-4 mb-6">
                <button type="button" (click)="selectMetodoPago('tarjeta')" class="rounded-2xl border p-4 text-left transition-all duration-200" [ngClass]="metodoPago() === 'tarjeta' ? 'border-accent-primary bg-accent-primary/10 shadow-[0_12px_28px_rgba(223,227,29,0.08)]' : 'border-border-subtle hover:border-text-secondary bg-bg-main/40'"><lucide-icon [img]="CreditCard" [size]="22" class="mb-3 text-accent-primary"></lucide-icon><p class="font-semibold text-text-primary">Tarjeta con Stripe</p><p class="text-xs text-text-secondary mt-1">Checkout seguro y validado por Stripe</p></button>
              </div>

              <div class="rounded-3xl border border-white/5 bg-[linear-gradient(135deg,#111827,#1f2937_60%,#0f172a)] p-5 text-white shadow-xl">
                <p class="text-[11px] uppercase tracking-[0.24em] text-white/55">Stripe Checkout</p>
                <p class="mt-6 text-2xl font-black tracking-[0.2em]">4242 4242 4242 4242</p>
                <div class="mt-6 flex items-end justify-between gap-4"><div><p class="text-[10px] uppercase tracking-[0.2em] text-white/45">Titular</p><p class="mt-1 font-semibold">TEST USER</p></div><div class="text-right"><p class="text-[10px] uppercase tracking-[0.2em] text-white/45">Vence</p><p class="mt-1 font-semibold">12/34</p></div></div>
              </div>
              <div class="rounded-2xl border border-border-subtle bg-bg-surface px-4 py-4 text-sm text-text-secondary">
                Stripe solicitará los datos de prueba dentro de su formulario seguro. El monto enviado será el total final del pedido, incluyendo cualquier descuento aplicado previamente.
              </div>
              <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-text-secondary mt-6">
                <div class="rounded-2xl border border-border-subtle bg-bg-surface px-4 py-3">1. Crear pedido</div>
                <div class="rounded-2xl border border-border-subtle bg-bg-surface px-4 py-3">2. Redirigir a Stripe</div>
                <div class="rounded-2xl border border-border-subtle bg-bg-surface px-4 py-3">3. Confirmar pago</div>
              </div>
            </div>
          </section>
        </div>

          <aside class="lg:col-span-1">
          <div class="bg-bg-surface p-6 rounded-card border border-border-subtle sticky top-24 space-y-5">
            <h3 class="text-xl font-bold text-text-primary">Resumen de la Orden</h3>
            <div class="space-y-4 max-h-[40vh] overflow-y-auto pr-2">
              <div *ngFor="let item of cartService.items()" class="flex gap-4">
                <div class="w-16 h-16 bg-white p-1 rounded-sm border border-border-subtle flex-shrink-0"><img [src]="item.producto.imagen_url || 'https://placehold.co/400x400/1E293B/38BDF8?text=NO+IMG'" class="w-full h-full object-contain"></div>
                <div class="flex-grow"><h4 class="text-sm text-text-primary line-clamp-2">{{ item.producto.nombre }}</h4><div class="flex justify-between items-center mt-1"><span class="text-xs text-text-secondary">Cant: {{ item.cantidad }}</span><span class="text-sm font-medium">{{ (item.producto.precio_oferta || item.producto.precio) | currency:'PEN':'S/ ' }}</span></div></div>
              </div>
            </div>

            <!-- Cupón de descuento -->
            <div class="rounded-2xl border border-border-subtle bg-bg-main/70 p-4 space-y-3">
              <label class="block text-sm font-medium text-text-primary">Código de descuento</label>
              <div class="flex gap-2">
                <input type="text" [ngModel]="cuponCodigo()" (ngModelChange)="cuponCodigo.set($event)" [ngModelOptions]="{ standalone: true }" placeholder="Ingresa tu cupón" class="flex-1 rounded-xl border border-border-subtle bg-bg-surface px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent-primary uppercase" [disabled]="loading()">
              </div>
              <p *ngIf="cuponError()" class="text-xs text-red-400">{{ cuponError() }}</p>
            </div>

            <div class="border-t border-border-subtle pt-4 space-y-3">
              <div class="flex justify-between text-text-secondary"><span>Subtotal</span><span>{{ cartService.totalAmount() | currency:'PEN':'S/ ' }}</span></div>
              <div *ngIf="descuentoAplicado() > 0" class="flex justify-between text-emerald-400">
                <span>Descuento</span>
                <span>-{{ descuentoAplicado() | currency:'PEN':'S/ ' }}</span>
              </div>
              <div class="flex justify-between text-text-secondary"><span>Envío</span><span>Gratis</span></div>
              <div class="flex justify-between text-lg font-bold text-text-primary pt-3 border-t border-border-subtle">
                <span>Total</span>
                <span>{{ (cartService.totalAmount() - descuentoAplicado()) | currency:'PEN':'S/ ' }}</span>
              </div>
            </div>
            <div class="rounded-2xl border border-border-subtle bg-bg-main/70 p-4">
              <p class="text-xs uppercase tracking-[0.2em] text-text-secondary">Estado del procesamiento</p>
              <div class="mt-3 flex items-center gap-3">
                <lucide-icon [img]="loading() ? LoaderCircle : CheckCircle" [size]="18" [class]="loading() ? 'animate-spin text-accent-primary' : 'text-text-secondary'"></lucide-icon>
                <p class="text-sm text-text-primary">{{ paymentStageMessage() }}</p>
              </div>
            </div>
            <div *ngIf="errorMessage()" class="text-red-400 text-sm bg-red-500/10 p-3 rounded-sm border border-red-500/30">{{ errorMessage() }}</div>
            <app-button variant="primary" [fullWidth]="true" size="lg" (onClick)="procesarOrden()" [disabled]="loading() || !direccionSeleccionada() || !metodoPago() || cartService.items().length === 0">
              {{ loading() ? 'Preparando Stripe Checkout...' : 'Continuar con Stripe' }}
            </app-button>
          </div>
        </aside>
      </div>
    </div>
  `,
  styles: []
})
export class CheckoutComponent implements OnInit, OnDestroy {
  cartService = inject(CartService);
  private checkoutService = inject(CheckoutService);
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private toast = inject(ToastService);

  readonly CreditCard = CreditCard;
  readonly MapPin = MapPin;
  readonly CheckCircle = CheckCircle;
  readonly WalletCards = WalletCards;
  readonly ShieldCheck = ShieldCheck;
  readonly LoaderCircle = LoaderCircle;
  readonly BadgeCheck = BadgeCheck;

  direcciones = signal<Direccion[]>([]);
  direccionSeleccionada = signal<number | null>(null);
  mostrarFormularioDireccion = signal(false);
  metodoPago = signal('tarjeta');
  loading = signal(false);
  loadingDireccion = signal(false);
  errorMessage = signal('');
  pedidoExitoso = signal(false);
  pedidoConfirmado = signal<PedidoDetalle | null>(null);
  paymentStage = signal<PaymentStage>('idle');
  cuponCodigo = signal('');
  descuentoAplicado = signal(0);
  cuponError = signal('');
  private paymentTimers: Array<ReturnType<typeof setTimeout>> = [];

  direccionForm = this.fb.group({
    titulo: ['', Validators.required],
    direccion: ['', Validators.required],
    ciudad: ['', Validators.required],
    pais: ['Perú', Validators.required],
    codigo_postal: [''],
    es_principal: [true]
  });

  ngOnInit() {
    const pedidoId = this.route.snapshot.queryParamMap.get('pedido_id');
    const stripeSessionId = this.route.snapshot.queryParamMap.get('session_id');
    const stripeStatus = this.route.snapshot.queryParamMap.get('stripe');

    if (pedidoId && stripeSessionId && stripeStatus === 'success') {
      this.confirmarRetornoStripe(pedidoId, stripeSessionId);
      return;
    }

    if (stripeStatus === 'cancel') {
      const mensaje = 'El pago en Stripe fue cancelado o rechazado. Puedes intentarlo nuevamente.';
      this.errorMessage.set(mensaje);
      this.paymentStage.set('error');
      this.toast.error(mensaje, 'Pago no completado');
    }

    if (this.cartService.items().length === 0) {
      this.router.navigate(['/']);
      return;
    }
    this.cargarDirecciones();
  }

  ngOnDestroy() {
    this.clearPaymentTimers();
  }

  cargarDirecciones() {
    this.checkoutService.getDirecciones().subscribe({
      next: (dirs) => {
        this.direcciones.set(dirs);
        if (dirs.length > 0) {
          const principal = dirs.find((d) => d.es_principal);
          this.direccionSeleccionada.set(principal ? principal.id : dirs[0].id);
        }
      },
      error: () => console.warn('No se pudieron cargar direcciones.')
    });
  }

  seleccionarDireccion(id: number) {
    this.direccionSeleccionada.set(id);
  }

  selectMetodoPago(metodo: string) {
    this.metodoPago.set(metodo);
    this.errorMessage.set('');
    this.paymentStage.set('idle');
  }

  guardarDireccion() {
    if (this.direccionForm.invalid) return;
    this.loadingDireccion.set(true);
    this.checkoutService.crearDireccion(this.direccionForm.value as any).subscribe({
      next: (dir) => {
        this.direcciones.update((d) => [...d, dir]);
        this.direccionSeleccionada.set(dir.id);
        this.mostrarFormularioDireccion.set(false);
        this.loadingDireccion.set(false);
        this.direccionForm.reset({ pais: 'Perú', es_principal: true });
        this.toast.success('La nueva dirección fue guardada.', 'Dirección Agregada');
      },
      error: () => {
        const mockDir = { ...this.direccionForm.value, id: Date.now() } as Direccion;
        this.direcciones.update((d) => [...d, mockDir]);
        this.direccionSeleccionada.set(mockDir.id);
        this.mostrarFormularioDireccion.set(false);
        this.loadingDireccion.set(false);
        this.toast.success('La nueva dirección fue guardada (mock).', 'Dirección Agregada');
      }
    });
  }

  async procesarOrden() {
    const dirId = this.direccionSeleccionada();
    const metodo = this.metodoPago();
    if (!dirId || !metodo) {
      this.errorMessage.set('Selecciona una dirección y un método de pago.');
      return;
    }

    this.loading.set(true);
    this.errorMessage.set('');
    this.startPaymentStageAnimation();

    try {
      await this.cartService.flushPendingSync();
    } catch {
      this.loading.set(false);
      this.paymentStage.set('error');
      const mensaje = 'No se pudo sincronizar el carrito. Intenta nuevamente en unos segundos.';
      this.errorMessage.set(mensaje);
      this.toast.error(mensaje, 'Pago rechazado');
      return;
    }

    const cuponCodigo = this.cuponCodigo().trim().toUpperCase() || undefined;

    this.checkoutService.procesarCheckout({
      direccion_id: dirId,
      metodo_pago: metodo,
      cupon_codigo: cuponCodigo,
    }).subscribe({
      next: (pedido) => {
        const successUrl = `${window.location.origin}/checkout?stripe=success&pedido_id=${pedido.id}&session_id={CHECKOUT_SESSION_ID}`;
        const cancelUrl = `${window.location.origin}/checkout?stripe=cancel&pedido_id=${pedido.id}`;

        this.checkoutService.crearStripeCheckout(pedido.id, {
          success_url: successUrl,
          cancel_url: cancelUrl,
        }).subscribe({
          next: ({ checkout_url }: StripeCheckoutResponse) => {
            window.location.assign(checkout_url);
          },
          error: (err: any) => {
            this.clearPaymentTimers();
            this.paymentStage.set('error');
            this.loading.set(false);
            const mensaje = err?.error?.detail || 'No se pudo iniciar Stripe Checkout.';
            this.errorMessage.set(mensaje);
            this.toast.error(mensaje, 'Pago rechazado');
          }
        });
      },
      error: (err: any) => {
        this.clearPaymentTimers();
        this.paymentStage.set('error');
        this.loading.set(false);
        const mensaje = err?.error?.detail || 'No se pudo crear el pedido. Intenta de nuevo.';
        this.errorMessage.set(mensaje);
        this.toast.error(mensaje, 'Pago rechazado');
      }
    });
  }

  paymentStageLabel(): string {
    return {
      idle: 'Listo',
      authorizing: 'Autorizando',
      capturing: 'Capturando',
      success: 'Aprobado',
      error: 'Error',
    }[this.paymentStage()];
  }

  paymentStageDot(): string {
    return {
      idle: 'bg-text-secondary',
      authorizing: 'bg-amber-300',
      capturing: 'bg-sky-300',
      success: 'bg-emerald-300',
      error: 'bg-red-400',
    }[this.paymentStage()];
  }

  paymentStageMessage(): string {
    return {
      idle: 'Completa la pasarela y confirma el pedido.',
      authorizing: 'Preparando el pedido antes de enviar a Stripe.',
      capturing: 'Validando el resultado del pago con Stripe.',
      success: 'Pago confirmado con Stripe.',
      error: 'Ocurrió un problema al procesar el pago.',
    }[this.paymentStage()];
  }

  humanMetodo(metodo?: string | null): string {
    switch (metodo) {
      case 'tarjeta':
        return 'Tarjeta';
      case 'paypal':
        return 'PayPal';
      case 'transferencia':
        return 'Transferencia';
      case 'efectivo':
        return 'Efectivo';
      default:
        return 'Otro';
    }
  }

  shortId(id: string): string {
    return id.slice(0, 8).toUpperCase();
  }

  private startPaymentStageAnimation(): void {
    this.clearPaymentTimers();
    this.paymentStage.set('authorizing');
    this.paymentTimers.push(setTimeout(() => {
      if (this.loading()) this.paymentStage.set('capturing');
    }, 900));
  }

  private clearPaymentTimers(): void {
    this.paymentTimers.forEach((timer) => clearTimeout(timer));
    this.paymentTimers = [];
  }

  private confirmarRetornoStripe(pedidoId: string, stripeSessionId: string): void {
    this.loading.set(true);
    this.errorMessage.set('');
    this.paymentStage.set('capturing');

    this.checkoutService.confirmarPagoStripe(pedidoId, {
      stripe_session_id: stripeSessionId,
    }).subscribe({
      next: (pago: PagoResumen) => {
        this.checkoutService.getPedidoDetalle(pedidoId).subscribe({
          next: (pedido) => {
            this.pedidoConfirmado.set({ ...pedido, pago });
            this.descuentoAplicado.set(pedido.descuento || 0);
            this.pedidoExitoso.set(true);
            this.paymentStage.set('success');
            this.loading.set(false);
            this.cartService.clearCart();
            this.toast.success('El pago fue confirmado correctamente.', 'Pedido Confirmado');
          },
          error: (err: any) => {
            this.paymentStage.set('error');
            this.loading.set(false);
            const mensaje = err?.error?.detail || 'El pago se confirmó, pero no se pudo cargar el pedido.';
            this.errorMessage.set(mensaje);
            this.toast.warning(mensaje, 'Pedido pendiente');
          }
        });
      },
      error: (err: any) => {
        this.paymentStage.set('error');
        this.loading.set(false);
        const mensaje = err?.error?.detail || 'No se pudo confirmar el pago con Stripe.';
        this.errorMessage.set(mensaje);
        this.toast.error(mensaje, 'Pago rechazado');
      }
    });
  }
}
