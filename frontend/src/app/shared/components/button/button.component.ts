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
  styles: []
})
export class ButtonComponent {
  @Input() variant: ButtonVariant = 'primary';
  @Input() size: ButtonSize = 'md';
  @Input() type: 'button' | 'submit' | 'reset' = 'button';
  @Input() disabled: boolean = false;
  @Input() fullWidth: boolean = false;

  @Output() onClick = new EventEmitter<Event>();

  baseClasses = 'inline-flex items-center justify-center font-medium transition-colors rounded-pill focus:outline-none focus:ring-2 focus:ring-accent-primary focus:ring-offset-2 focus:ring-offset-bg-main';

  variantClasses: Record<ButtonVariant, string> = {
    primary: 'bg-accent-primary text-text-inverse hover:bg-accent-hover',
    secondary: 'bg-transparent border border-border-subtle text-text-primary hover:border-text-secondary',
    ghost: 'bg-transparent text-text-primary hover:bg-bg-surface'
  };

  sizeClasses: Record<ButtonSize, string> = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-6 py-2.5 text-base',
    lg: 'px-8 py-3.5 text-lg'
  };
}
