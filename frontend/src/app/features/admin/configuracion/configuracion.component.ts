import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import {
  AlertTriangle,
  CheckCircle2,
  KeyRound,
  Loader,
  LucideAngularModule,
  Save,
  ShieldCheck,
  UserCog,
} from 'lucide-angular';
import { ButtonComponent } from '../../../shared/components/button/button.component';
import { AuthService, Usuario } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-admin-configuracion',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, LucideAngularModule, ButtonComponent],
  template: `
    <div class="max-w-7xl mx-auto space-y-6">
      <section class="rounded-card border border-border-subtle bg-bg-surface/90 p-6 md:p-7">
        <div class="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
          <div>
            <p class="text-xs uppercase tracking-[0.25em] text-text-secondary">Configuracion</p>
            <h1 class="text-3xl font-black tracking-tight mt-1">Perfil de Administrador</h1>
            <p class="text-text-secondary mt-2 max-w-2xl">
              El backend no expone configuracion global de tienda, asi que esta seccion administra perfil y seguridad del usuario admin autenticado.
            </p>
          </div>

          <div class="grid grid-cols-2 sm:grid-cols-3 gap-3 min-w-[280px]">
            <div class="rounded-sm border border-border-subtle bg-bg-main/60 px-3 py-2">
              <p class="text-xs uppercase tracking-[0.18em] text-text-secondary">Rol</p>
              <p class="text-xl font-black mt-1 text-accent-primary">{{ me()?.rol || '-' }}</p>
            </div>
            <div class="rounded-sm border border-border-subtle bg-bg-main/60 px-3 py-2">
              <p class="text-xs uppercase tracking-[0.18em] text-text-secondary">Estado</p>
              <p class="text-xl font-black mt-1" [ngClass]="me()?.activo ? 'text-emerald-400' : 'text-rose-400'">
                {{ me()?.activo ? 'Activo' : 'Inactivo' }}
              </p>
            </div>
            <div class="rounded-sm border border-border-subtle bg-bg-main/60 px-3 py-2">
              <p class="text-xs uppercase tracking-[0.18em] text-text-secondary">Sesion</p>
              <p class="text-xl font-black mt-1">Vigente</p>
            </div>
          </div>
        </div>
      </section>

      <section class="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <article class="xl:col-span-2 rounded-card border border-border-subtle bg-bg-surface/90 p-6 space-y-5">
          <div class="flex items-center gap-2 text-text-primary">
            <lucide-icon [img]="UserCog" [size]="18"></lucide-icon>
            <h2 class="text-xl font-black tracking-tight">Datos personales</h2>
          </div>

          <form [formGroup]="profileForm" (ngSubmit)="guardarPerfil()" class="space-y-4">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label class="space-y-1.5 text-sm">
                <span class="text-text-secondary">Nombre</span>
                <input
                  formControlName="nombre"
                  type="text"
                  class="w-full px-3 py-2 bg-bg-main border border-border-subtle rounded-sm focus:outline-none focus:border-accent-primary"
                />
              </label>

              <label class="space-y-1.5 text-sm">
                <span class="text-text-secondary">Apellido</span>
                <input
                  formControlName="apellido"
                  type="text"
                  class="w-full px-3 py-2 bg-bg-main border border-border-subtle rounded-sm focus:outline-none focus:border-accent-primary"
                />
              </label>
            </div>

            <label class="space-y-1.5 text-sm block">
              <span class="text-text-secondary">Telefono</span>
              <input
                formControlName="telefono"
                type="text"
                class="w-full px-3 py-2 bg-bg-main border border-border-subtle rounded-sm focus:outline-none focus:border-accent-primary"
              />
            </label>

            <div class="rounded-sm border border-border-subtle bg-bg-main/60 px-3 py-2 text-sm">
              <span class="text-text-secondary">Email: </span>
              <span class="text-text-primary">{{ me()?.email || '-' }}</span>
            </div>

            <div class="flex justify-end">
              <app-button type="submit" variant="primary" [disabled]="profileSaving() || profileForm.invalid">
                <span class="inline-flex items-center gap-2">
                  <lucide-icon [img]="profileSaving() ? Loader : Save" [size]="13" [ngClass]="profileSaving() ? 'animate-spin' : ''"></lucide-icon>
                  {{ profileSaving() ? 'Guardando...' : 'Guardar perfil' }}
                </span>
              </app-button>
            </div>
          </form>
        </article>

        <article class="rounded-card border border-border-subtle bg-bg-surface/90 p-6 space-y-4">
          <div class="flex items-center gap-2 text-text-primary">
            <lucide-icon [img]="ShieldCheck" [size]="18"></lucide-icon>
            <h2 class="text-xl font-black tracking-tight">Estado de cuenta</h2>
          </div>

          <div class="space-y-2 text-sm text-text-secondary">
            <p class="rounded-sm border border-border-subtle bg-bg-main/60 px-3 py-2">
              <span class="text-text-primary">Usuario:</span> {{ me()?.nombre }} {{ me()?.apellido }}
            </p>
            <p class="rounded-sm border border-border-subtle bg-bg-main/60 px-3 py-2">
              <span class="text-text-primary">Rol:</span> {{ me()?.rol || '-' }}
            </p>
            <p class="rounded-sm border border-border-subtle bg-bg-main/60 px-3 py-2">
              <span class="text-text-primary">Activo:</span> {{ me()?.activo ? 'Si' : 'No' }}
            </p>
          </div>

          <div class="rounded-sm border border-amber-500/30 bg-amber-500/10 text-amber-200 text-xs px-3 py-2 flex items-start gap-2">
            <lucide-icon [img]="AlertTriangle" [size]="14" class="mt-0.5"></lucide-icon>
            Los ajustes globales de tienda no estan expuestos por API todavia. Este modulo queda preparado para agregarlos cuando existan endpoints.
          </div>
        </article>
      </section>

      <section class="rounded-card border border-border-subtle bg-bg-surface/90 p-6 space-y-5">
        <div class="flex items-center gap-2 text-text-primary">
          <lucide-icon [img]="KeyRound" [size]="18"></lucide-icon>
          <h2 class="text-xl font-black tracking-tight">Seguridad</h2>
        </div>

        <form [formGroup]="passwordForm" (ngSubmit)="cambiarContrasena()" class="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <label class="space-y-1.5 text-sm">
            <span class="text-text-secondary">Contraseña actual</span>
            <input
              formControlName="current_password"
              type="password"
              class="w-full px-3 py-2 bg-bg-main border border-border-subtle rounded-sm focus:outline-none focus:border-accent-primary"
            />
          </label>

          <label class="space-y-1.5 text-sm">
            <span class="text-text-secondary">Nueva contraseña</span>
            <input
              formControlName="new_password"
              type="password"
              class="w-full px-3 py-2 bg-bg-main border border-border-subtle rounded-sm focus:outline-none focus:border-accent-primary"
            />
          </label>

          <label class="space-y-1.5 text-sm">
            <span class="text-text-secondary">Confirmar contraseña</span>
            <input
              formControlName="confirm_password"
              type="password"
              class="w-full px-3 py-2 bg-bg-main border border-border-subtle rounded-sm focus:outline-none focus:border-accent-primary"
            />
          </label>

          <div class="lg:col-span-3 flex flex-col md:flex-row md:items-center justify-between gap-3">
            <app-button type="submit" variant="secondary" [disabled]="passwordSaving() || passwordForm.invalid">
              <span class="inline-flex items-center gap-2">
                <lucide-icon [img]="passwordSaving() ? Loader : CheckCircle2" [size]="13" [ngClass]="passwordSaving() ? 'animate-spin' : ''"></lucide-icon>
                {{ passwordSaving() ? 'Actualizando...' : 'Actualizar contraseña' }}
              </span>
            </app-button>
          </div>
        </form>
      </section>
    </div>
  `,
  styles: []
})
export class AdminConfiguracionComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly fb = inject(FormBuilder);
  private readonly toast = inject(ToastService);

  readonly UserCog = UserCog;
  readonly Save = Save;
  readonly Loader = Loader;
  readonly ShieldCheck = ShieldCheck;
  readonly AlertTriangle = AlertTriangle;
  readonly KeyRound = KeyRound;
  readonly CheckCircle2 = CheckCircle2;

  readonly me = signal<Usuario | null>(null);

  readonly profileSaving = signal(false);

  readonly passwordSaving = signal(false);

  readonly profileForm = this.fb.group({
    nombre: ['', [Validators.required, Validators.minLength(1)]],
    apellido: ['', [Validators.required, Validators.minLength(1)]],
    telefono: [''],
  });

  readonly passwordForm = this.fb.group({
    current_password: ['', [Validators.required, Validators.minLength(8)]],
    new_password: ['', [Validators.required, Validators.minLength(8)]],
    confirm_password: ['', [Validators.required, Validators.minLength(8)]],
  });

  ngOnInit(): void {
    this.cargarPerfil();
  }

  guardarPerfil(): void {
    if (this.profileForm.invalid || this.profileSaving()) {
      this.profileForm.markAllAsTouched();
      this.toast.warning('Completa los campos requeridos del perfil.');
      return;
    }

    this.profileSaving.set(true);

    const value = this.profileForm.getRawValue();

    this.authService.updateProfile({
      nombre: String(value.nombre ?? '').trim(),
      apellido: String(value.apellido ?? '').trim(),
      telefono: String(value.telefono ?? '').trim() || undefined,
    }).subscribe({
      next: (user) => {
        this.me.set(user);
        this.profileSaving.set(false);
        this.toast.success('Perfil actualizado correctamente.');
      },
      error: () => {
        this.profileSaving.set(false);
      },
    });
  }

  cambiarContrasena(): void {
    if (this.passwordForm.invalid || this.passwordSaving()) {
      this.passwordForm.markAllAsTouched();
      this.toast.warning('Completa correctamente los campos de contraseña.');
      return;
    }

    const value = this.passwordForm.getRawValue();
    if (value.new_password !== value.confirm_password) {
      this.toast.warning('La nueva contraseña y la confirmación no coinciden.');
      return;
    }

    this.passwordSaving.set(true);

    this.authService.changePassword({
      current_password: String(value.current_password),
      new_password: String(value.new_password),
    }).subscribe({
      next: (response) => {
        this.passwordSaving.set(false);
        this.toast.success(response.message || 'Contraseña actualizada correctamente.');
        this.passwordForm.reset({
          current_password: '',
          new_password: '',
          confirm_password: '',
        });
      },
      error: () => {
        this.passwordSaving.set(false);
      },
    });
  }

  private cargarPerfil(): void {
    const cached = this.authService.currentUser();

    if (cached) {
      this.applyUser(cached);
    }

    this.authService.fetchCurrentUser().subscribe({
      next: (user) => this.applyUser(user),
      error: () => {},
    });
  }

  private applyUser(user: Usuario): void {
    this.me.set(user);
    this.profileForm.reset({
      nombre: user.nombre,
      apellido: user.apellido,
      telefono: user.telefono ?? '',
    });
  }
}
