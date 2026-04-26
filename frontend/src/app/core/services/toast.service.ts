import { Injectable, signal } from '@angular/core';

export type ToastVariant = 'success' | 'error' | 'warning' | 'info';

export interface ToastOptions {
  title?: string;
  message: string;
  variant?: ToastVariant;
  duration?: number;
}

export interface ToastMessage {
  id: number;
  title?: string;
  message: string;
  variant: ToastVariant;
  duration: number;
}

@Injectable({
  providedIn: 'root'
})
export class ToastService {
  private readonly toastsSignal = signal<ToastMessage[]>([]);
  readonly toasts = this.toastsSignal.asReadonly();

  private nextId = 1;
  private readonly timers = new Map<number, number>();

  show(options: ToastOptions): number {
    const id = this.nextId++;

    const toast: ToastMessage = {
      id,
      title: options.title,
      message: options.message,
      variant: options.variant ?? 'info',
      duration: options.duration ?? 3600,
    };

    this.toastsSignal.update((list) => [...list, toast]);

    if (toast.duration > 0) {
      const timer = window.setTimeout(() => {
        this.dismiss(id);
      }, toast.duration);
      this.timers.set(id, timer);
    }

    return id;
  }

  success(message: string, title = 'Operacion exitosa', duration = 3200): number {
    return this.show({ message, title, duration, variant: 'success' });
  }

  error(message: string, title = 'Ocurrio un error', duration = 4200): number {
    return this.show({ message, title, duration, variant: 'error' });
  }

  warning(message: string, title = 'Atencion', duration = 3600): number {
    return this.show({ message, title, duration, variant: 'warning' });
  }

  info(message: string, title = 'Informacion', duration = 3000): number {
    return this.show({ message, title, duration, variant: 'info' });
  }

  dismiss(id: number): void {
    const timer = this.timers.get(id);
    if (timer !== undefined) {
      window.clearTimeout(timer);
      this.timers.delete(id);
    }

    this.toastsSignal.update((list) => list.filter((toast) => toast.id !== id));
  }

  clear(): void {
    this.timers.forEach((timer) => window.clearTimeout(timer));
    this.timers.clear();
    this.toastsSignal.set([]);
  }
}
