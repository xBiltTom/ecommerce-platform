import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, RouterModule } from '@angular/router';
import { LucideAngularModule, ArrowLeft } from 'lucide-angular';

@Component({
  selector: 'app-auth-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterModule, LucideAngularModule],
  template: `
    <div class="min-h-screen flex text-text-primary bg-bg-main">
      
      <!-- Left: Decorative / Branding Section -->
      <div class="hidden lg:flex lg:w-1/2 relative bg-bg-surface overflow-hidden border-r border-border-subtle flex-col justify-between p-12">
        
        <!-- Animated Background / Cyber Pattern -->
        <div class="absolute inset-0 opacity-10 pointer-events-none" style="background-image: radial-gradient(var(--color-accent-primary) 1px, transparent 1px); background-size: 40px 40px;"></div>
        
        <!-- Glassmorphism overlay for depth -->
        <div class="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-accent-primary/20 rounded-full blur-[100px] mix-blend-screen pointer-events-none"></div>

        <div class="relative z-10 flex items-center">
          <div class="w-10 h-10 rounded-sm bg-accent-primary flex items-center justify-center mr-3 shadow-[0_0_20px_rgba(223,227,29,0.4)]">
            <span class="text-text-inverse font-bold font-sans tracking-tighter text-xl">PR</span>
          </div>
          <span class="text-2xl font-bold tracking-tight">ProTech</span>
        </div>

        <div class="relative z-10 max-w-md">
          <h1 class="text-4xl lg:text-5xl font-bold tracking-tight mb-6">
            Equipando a los creadores del mañana.
          </h1>
          <p class="text-text-secondary text-lg leading-relaxed">
            Accede a tu cuenta para gestionar tus pedidos, revisar tus facturas y descubrir ofertas exclusivas en hardware de alto rendimiento.
          </p>
        </div>

        <div class="relative z-10">
          <p class="text-sm text-text-secondary">&copy; 2026 ProTech Inc. Todos los derechos reservados.</p>
        </div>
      </div>

      <!-- Right: Form Section -->
      <div class="w-full lg:w-1/2 flex flex-col p-8 sm:p-12 relative overflow-y-auto">
        <!-- Back Button -->
        <div class="mb-8 self-start">
          <a routerLink="/" class="flex items-center text-sm font-medium text-text-secondary hover:text-accent-primary transition-colors cursor-pointer group">
            <lucide-icon [img]="ArrowLeft" [size]="16" class="mr-2 group-hover:-translate-x-1 transition-transform"></lucide-icon>
            Volver a la tienda
          </a>
        </div>
        
        <div class="w-full max-w-md mx-auto flex-grow flex flex-col justify-center">
          <router-outlet></router-outlet>
        </div>
      </div>

    </div>
  `,
  styles: []
})
export class AuthLayoutComponent {
  readonly ArrowLeft = ArrowLeft;
}
