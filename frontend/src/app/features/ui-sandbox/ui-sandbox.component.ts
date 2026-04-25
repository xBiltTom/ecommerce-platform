import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonComponent } from '../../shared/components/button/button.component';
import { BadgeComponent } from '../../shared/components/badge/badge.component';
import { InputComponent } from '../../shared/components/input/input.component';
import { ProductCardComponent, ProductData } from '../../shared/components/product-card/product-card.component';
import { LucideAngularModule, Search, ArrowRight } from 'lucide-angular';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-ui-sandbox',
  standalone: true,
  imports: [CommonModule, FormsModule, ButtonComponent, BadgeComponent, InputComponent, ProductCardComponent, LucideAngularModule],
  template: `
    <div class="min-h-screen p-8 max-w-7xl mx-auto space-y-16">
      
      <header class="border-b border-border-subtle pb-8">
        <h1 class="text-4xl font-bold text-text-primary">Protech Design System</h1>
        <p class="text-text-secondary mt-2">UI Components Sandbox</p>
      </header>

      <!-- Buttons -->
      <section class="space-y-6">
        <h2 class="text-2xl font-bold border-b border-border-subtle pb-2">Buttons</h2>
        <div class="flex flex-wrap gap-6 items-end">
          <div class="space-y-4">
            <h3 class="text-text-secondary text-sm">Primary</h3>
            <div class="flex gap-4 items-center">
              <app-button variant="primary" size="sm">Small</app-button>
              <app-button variant="primary" size="md">Medium</app-button>
              <app-button variant="primary" size="lg">Large</app-button>
            </div>
          </div>
          
          <div class="space-y-4">
            <h3 class="text-text-secondary text-sm">Secondary</h3>
            <div class="flex gap-4 items-center">
              <app-button variant="secondary" size="md">Secondary</app-button>
            </div>
          </div>
          
          <div class="space-y-4">
            <h3 class="text-text-secondary text-sm">Ghost</h3>
            <div class="flex gap-4 items-center">
              <app-button variant="ghost" size="md">Ghost</app-button>
            </div>
          </div>

          <div class="space-y-4">
            <h3 class="text-text-secondary text-sm">With Icon</h3>
            <div class="flex gap-4 items-center">
              <app-button variant="primary" size="md">
                Checkout <lucide-icon [img]="ArrowRight" class="ml-2" [size]="18"></lucide-icon>
              </app-button>
            </div>
          </div>
        </div>
      </section>

      <!-- Badges -->
      <section class="space-y-6">
        <h2 class="text-2xl font-bold border-b border-border-subtle pb-2">Badges</h2>
        <div class="flex gap-4">
          <app-badge variant="default">New Release</app-badge>
          <app-badge variant="outline">Out of stock</app-badge>
        </div>
      </section>

      <!-- Inputs -->
      <section class="space-y-6">
        <h2 class="text-2xl font-bold border-b border-border-subtle pb-2">Inputs & Form Controls</h2>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
          <app-input label="Default Input" placeholder="Enter your email"></app-input>
          <app-input label="With Error" placeholder="Enter password" type="password" error="This field is required"></app-input>
          <app-input label="Disabled" placeholder="Cannot edit this" [disabled]="true"></app-input>
        </div>
      </section>

      <!-- Product Cards -->
      <section class="space-y-6">
        <h2 class="text-2xl font-bold border-b border-border-subtle pb-2">Product Cards</h2>
        <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          
          <!-- Transparente -->
          <app-product-card 
            [product]="product1"
            [isNew]="true"
            [requiresWhiteBg]="false">
          </app-product-card>

          <!-- Fondo blanco forzado -->
          <app-product-card 
            [product]="product2"
            [requiresWhiteBg]="true">
          </app-product-card>
          
        </div>
      </section>

    </div>
  `,
  styles: []
})
export class UiSandboxComponent {
  product1: ProductData = {
    id: 1,
    nombre: 'CyberX Pro Headphones with Active Noise Cancelling',
    precio: 299.99,
    precio_oferta: 249.99,
    categoria_nombre: 'Audio',
    imagen_url: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500&q=80&auto=format&fit=crop&ixlib=rb-4.0.3' // Will look weird without white bg, but good for testing overlay
  };

  product2: ProductData = {
    id: 2,
    nombre: 'Quantum Core Smartwatch 5th Gen',
    precio: 399.00,
    categoria_nombre: 'Wearables',
    imagen_url: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=500&q=80&auto=format&fit=crop&ixlib=rb-4.0.3' // Good for white bg
  };

  readonly Search = Search;
  readonly ArrowRight = ArrowRight;
}
