import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

type ButtonVariant = 'primary' | 'secondary' | 'ghost';
type ButtonSize = 'sm' | 'md' | 'lg';

@Component({
  selector: 'app-button',
  standalone: true,
  imports: [CommonModule],
  template: `
    <button
      [type]="type"
      [disabled]="disabled"
      (click)="onClick.emit($event)"
      [ngClass]="[baseClasses, variantClasses[variant], sizeClasses[size], fullWidth ? 'w-full' : '', disabled ? 'opacity-50 cursor-not-allowed' : '']"
    >
      <ng-content></ng-content>
    </button>
  `,
  styles: [
    `
      :host {
        display: contents;
      }
    `
  ]
})
export class ButtonComponent {
  @Input() variant: ButtonVariant = 'primary';
  @Input() size: ButtonSize = 'md';
  @Input() type: 'button' | 'submit' | 'reset' = 'button';
  @Input() disabled: boolean = false;
  @Input() fullWidth: boolean = false;

  @Output() onClick = new EventEmitter<Event>();

  baseClasses = 'inline-flex items-center justify-center font-medium transition-all duration-200 rounded-pill focus:outline-none focus:ring-2 focus:ring-accent-primary focus:ring-offset-2 focus:ring-offset-bg-main cursor-pointer active:scale-[0.98] disabled:active:scale-100';

  variantClasses: Record<ButtonVariant, string> = {
    primary: 'bg-accent-primary text-text-inverse hover:bg-accent-hover hover:shadow-[0_0_15px_rgba(223,227,29,0.3)]',
    secondary: 'bg-transparent border border-border-subtle text-text-primary hover:border-text-secondary hover:bg-bg-surface',
    ghost: 'bg-transparent text-text-primary hover:bg-bg-surface hover:text-accent-primary'
  };

  sizeClasses: Record<ButtonSize, string> = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-6 py-2.5 text-base',
    lg: 'px-8 py-3.5 text-lg'
  };
}
