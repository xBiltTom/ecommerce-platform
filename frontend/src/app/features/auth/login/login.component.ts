import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';
import { ButtonComponent } from '../../../shared/components/button/button.component';
import { InputComponent } from '../../../shared/components/input/input.component';
import { LucideAngularModule, LogIn } from 'lucide-angular';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, RouterModule, ReactiveFormsModule, ButtonComponent, InputComponent, LucideAngularModule],
  template: `
    <div class="w-full">
      <div class="mb-8">
        <h2 class="text-3xl font-bold text-text-primary mb-2 tracking-tight">Iniciar Sesión</h2>
        <p class="text-text-secondary">Ingresa tus credenciales para acceder a tu cuenta.</p>
      </div>

      <!-- Error Alert -->
      <div *ngIf="errorMessage()" class="mb-6 p-4 border border-red-500/30 bg-red-500/10 rounded-sm text-red-400 text-sm flex items-center transition-all duration-300">
        {{ errorMessage() }}
      </div>

      <form [formGroup]="loginForm" (ngSubmit)="onSubmit()" class="space-y-5">
        <app-input
          label="Correo Electrónico"
          type="email"
          id="email"
          placeholder="tu@email.com"
          formControlName="email"
          [error]="submitted() && f['email'].errors ? 'Ingresa un email válido' : ''"
        ></app-input>

        <div>
          <app-input
            label="Contraseña"
            type="password"
            id="password"
            placeholder="••••••••"
            formControlName="password"
            [error]="submitted() && f['password'].errors ? 'La contraseña es requerida' : ''"
          ></app-input>
          <div class="flex justify-end mt-2">
            <a href="#" class="text-xs text-accent-primary hover:text-accent-hover transition-colors font-medium">¿Olvidaste tu contraseña?</a>
          </div>
        </div>

        <app-button 
          type="submit" 
          variant="primary" 
          [fullWidth]="true" 
          size="lg"
          [disabled]="loading()"
          class="mt-8 block"
        >
          <span class="flex items-center justify-center gap-2">
            {{ loading() ? 'Iniciando sesión...' : 'Ingresar' }}
            <lucide-icon *ngIf="!loading()" [img]="LogIn" [size]="18"></lucide-icon>
          </span>
        </app-button>
      </form>

      <div class="mt-8 text-center text-sm text-text-secondary">
        ¿No tienes una cuenta? 
        <a routerLink="/auth/register" class="text-text-primary hover:text-accent-primary transition-colors font-medium ml-1">Regístrate</a>
      </div>
    </div>
  `,
  styles: []
})
export class LoginComponent {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private toast = inject(ToastService);

  readonly LogIn = LogIn;

  loginForm = this.fb.group({
    email: ['cliente@protech.com', [Validators.required, Validators.email]],
    password: ['admin123', Validators.required]
  });

  loading = signal(false);
  submitted = signal(false);
  errorMessage = signal('');

  get f() { return this.loginForm.controls; }

  onSubmit() {
    this.submitted.set(true);
    this.errorMessage.set('');

    if (this.loginForm.invalid) {
      return;
    }

    this.loading.set(true);
    
    // Attempt Login
    this.authService.login(this.loginForm.value, true).subscribe({
      next: () => {
        // Fetch current user after successful login
        this.authService.fetchCurrentUser(true).subscribe({
          next: () => {
            const returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/';
            this.router.navigateByUrl(returnUrl);
            this.toast.success('Bienvenido de vuelta.', 'Sesión iniciada');
          },
          error: () => {
            this.loading.set(false);
            this.errorMessage.set('Error obteniendo perfil.');
          }
        });
      },
      error: (err) => {
        this.loading.set(false);
        // The backend returns { detail: "message" }
        if (err.status === 401) {
          this.errorMessage.set('Credenciales inválidas. Por favor, intenta de nuevo.');
        } else {
          this.errorMessage.set('Ha ocurrido un error en el servidor. Intenta más tarde.');
        }
      }
    });
  }
}
