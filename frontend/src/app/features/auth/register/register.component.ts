import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from '../../../core/services/auth.service';
import { ButtonComponent } from '../../../shared/components/button/button.component';
import { InputComponent } from '../../../shared/components/input/input.component';
import { LucideAngularModule, UserPlus } from 'lucide-angular';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, RouterModule, ReactiveFormsModule, ButtonComponent, InputComponent, LucideAngularModule],
  template: `
    <div class="w-full">
      <div class="mb-8">
        <h2 class="text-3xl font-bold text-text-primary mb-2 tracking-tight">Crear Cuenta</h2>
        <p class="text-text-secondary">Únete a la plataforma líder para creadores.</p>
      </div>

      <!-- Error Alert -->
      <div *ngIf="errorMessage()" class="mb-6 p-4 border border-red-500/30 bg-red-500/10 rounded-sm text-red-400 text-sm flex items-center transition-all duration-300">
        {{ errorMessage() }}
      </div>

      <form [formGroup]="registerForm" (ngSubmit)="onSubmit()" class="space-y-4">
        
        <div class="grid grid-cols-2 gap-4">
          <app-input
            label="Nombre"
            type="text"
            id="nombre"
            placeholder="John"
            formControlName="nombre"
            [error]="submitted() && f['nombre'].errors ? 'Requerido' : ''"
          ></app-input>
          
          <app-input
            label="Apellido"
            type="text"
            id="apellido"
            placeholder="Doe"
            formControlName="apellido"
            [error]="submitted() && f['apellido'].errors ? 'Requerido' : ''"
          ></app-input>
        </div>

        <app-input
          label="Correo Electrónico"
          type="email"
          id="email"
          placeholder="tu@email.com"
          formControlName="email"
          [error]="submitted() && f['email'].errors ? 'Ingresa un email válido' : ''"
        ></app-input>

        <app-input
          label="Contraseña"
          type="password"
          id="password"
          placeholder="••••••••"
          formControlName="password"
          [error]="submitted() && f['password'].errors ? 'Mínimo 6 caracteres' : ''"
        ></app-input>

        <app-button 
          type="submit" 
          variant="primary" 
          [fullWidth]="true" 
          size="lg"
          [disabled]="loading()"
          class="mt-8 block"
        >
          <span class="flex items-center justify-center gap-2">
            {{ loading() ? 'Creando cuenta...' : 'Registrarse' }}
            <lucide-icon *ngIf="!loading()" [img]="UserPlus" [size]="18"></lucide-icon>
          </span>
        </app-button>
      </form>

      <div class="mt-8 text-center text-sm text-text-secondary">
        ¿Ya tienes una cuenta? 
        <a routerLink="/auth/login" class="text-text-primary hover:text-accent-primary transition-colors font-medium ml-1">Inicia sesión</a>
      </div>
    </div>
  `,
  styles: []
})
export class RegisterComponent {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);

  readonly UserPlus = UserPlus;

  registerForm = this.fb.group({
    nombre: ['', Validators.required],
    apellido: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]]
  });

  loading = signal(false);
  submitted = signal(false);
  errorMessage = signal('');

  get f() { return this.registerForm.controls; }

  onSubmit() {
    this.submitted.set(true);
    this.errorMessage.set('');

    if (this.registerForm.invalid) {
      return;
    }

    this.loading.set(true);
    
    this.authService.register(this.registerForm.value).subscribe({
      next: () => {
        // Al registrar exitosamente, procedemos a hacer login automáticamente
        const loginData = {
          email: this.registerForm.value.email,
          password: this.registerForm.value.password
        };
        
        this.authService.login(loginData).subscribe({
          next: () => {
            this.authService.fetchCurrentUser().subscribe({
              next: () => this.router.navigate(['/']),
              error: () => this.router.navigate(['/auth/login'])
            });
          },
          error: () => {
            this.loading.set(false);
            this.router.navigate(['/auth/login']);
          }
        });
      },
      error: (err) => {
        this.loading.set(false);
        if (err.status === 400 || err.status === 409) {
          this.errorMessage.set('El correo electrónico ya está registrado o es inválido.');
        } else {
          this.errorMessage.set('Ha ocurrido un error en el servidor. Intenta más tarde.');
        }
      }
    });
  }
}
