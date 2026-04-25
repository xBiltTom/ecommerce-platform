import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

export type BadgeVariant = 'default' | 'outline' | 'glass';

@Component({
  selector: 'app-badge',
  standalone: true,
  imports: [CommonModule],
  template: `
    <span
      [ngClass]="[baseClasses, variantClasses[variant]]"
    >
      <ng-content></ng-content>
    </span>
  `,
  styles: []
})
export class BadgeComponent {
  @Input() variant: BadgeVariant = 'default';

  baseClasses = 'inline-flex items-center px-2 py-0.5 rounded-pill text-xs font-semibold';

  variantClasses: Record<BadgeVariant, string> = {
    default: 'bg-accent-primary text-text-inverse',
    outline: 'bg-transparent border border-border-subtle text-text-secondary',
    glass: 'bg-bg-main/80 backdrop-blur-sm border border-border-subtle text-text-secondary'
  };
}
