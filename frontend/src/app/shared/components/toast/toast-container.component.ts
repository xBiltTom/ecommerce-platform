import { Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  AlertCircle,
  CheckCircle2,
  Info,
  LucideAngularModule,
  TriangleAlert,
  X,
} from 'lucide-angular';
import { ToastMessage, ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-toast-container',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  template: `
    <div class="fixed top-4 right-4 z-[120] w-[min(92vw,400px)] pointer-events-none space-y-2">
      <article
        *ngFor="let toast of toasts(); trackBy: trackById"
        class="pointer-events-auto rounded-card border shadow-xl p-4 backdrop-blur-sm toast-enter"
        [ngClass]="toastClass(toast.variant)"
      >
        <div class="flex items-start gap-3">
          <div class="mt-0.5" [ngClass]="iconClass(toast.variant)">
            <lucide-icon [img]="iconFor(toast.variant)" [size]="18"></lucide-icon>
          </div>

          <div class="min-w-0 flex-1">
            <p *ngIf="toast.title" class="text-sm font-semibold leading-tight">{{ toast.title }}</p>
            <p class="text-sm mt-1 text-text-secondary">{{ toast.message }}</p>
          </div>

          <button
            type="button"
            class="p-1 rounded-sm hover:bg-white/5 transition-colors cursor-pointer"
            (click)="dismiss(toast.id)"
            aria-label="Cerrar notificacion"
          >
            <lucide-icon [img]="X" [size]="14"></lucide-icon>
          </button>
        </div>
      </article>
    </div>
  `,
  styles: `
    .toast-enter {
      animation: toast-in 240ms ease-out both;
    }

    @keyframes toast-in {
      from {
        opacity: 0;
        transform: translateY(-8px) translateX(8px) scale(0.98);
      }
      to {
        opacity: 1;
        transform: translateY(0) translateX(0) scale(1);
      }
    }
  `
})
export class ToastContainerComponent {
  private readonly toastService = inject(ToastService);

  readonly toasts = this.toastService.toasts;
  readonly X = X;
  readonly CheckCircle2 = CheckCircle2;
  readonly AlertCircle = AlertCircle;
  readonly TriangleAlert = TriangleAlert;
  readonly Info = Info;

  readonly variantToIcon = computed(() => ({
    success: this.CheckCircle2,
    error: this.AlertCircle,
    warning: this.TriangleAlert,
    info: this.Info,
  }));

  trackById(_index: number, toast: ToastMessage): number {
    return toast.id;
  }

  dismiss(id: number): void {
    this.toastService.dismiss(id);
  }

  iconFor(variant: ToastMessage['variant']) {
    return this.variantToIcon()[variant];
  }

  toastClass(variant: ToastMessage['variant']): string {
    switch (variant) {
      case 'success':
        return 'bg-emerald-950/90 border-emerald-700/60 text-emerald-100';
      case 'error':
        return 'bg-rose-950/90 border-rose-700/60 text-rose-100';
      case 'warning':
        return 'bg-amber-950/90 border-amber-700/60 text-amber-100';
      case 'info':
      default:
        return 'bg-slate-900/95 border-slate-700/60 text-slate-100';
    }
  }

  iconClass(variant: ToastMessage['variant']): string {
    switch (variant) {
      case 'success':
        return 'text-emerald-300';
      case 'error':
        return 'text-rose-300';
      case 'warning':
        return 'text-amber-300';
      case 'info':
      default:
        return 'text-sky-300';
    }
  }
}
