import { Component, Input, forwardRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NG_VALUE_ACCESSOR, ControlValueAccessor, FormsModule } from '@angular/forms';

@Component({
  selector: 'app-input',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="flex flex-col gap-1.5 w-full">
      <label *ngIf="label" [for]="id" class="text-sm font-medium text-text-secondary">
        {{ label }}
      </label>
      <input
        [id]="id"
        [type]="type"
        [placeholder]="placeholder"
        [disabled]="disabled"
        [value]="value"
        (input)="onInputChange($event)"
        (blur)="onTouched()"
        [ngClass]="[
          'w-full px-4 py-2 bg-bg-surface border border-border-subtle rounded-sm text-text-primary placeholder:text-text-secondary/50',
          'focus:outline-none focus:border-accent-primary focus:ring-1 focus:ring-accent-primary transition-colors',
          disabled ? 'opacity-50 cursor-not-allowed' : '',
          error ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''
        ]"
      />
      <span *ngIf="error" class="text-xs text-red-500 mt-1">{{ error }}</span>
    </div>
  `,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => InputComponent),
      multi: true
    }
  ]
})
export class InputComponent implements ControlValueAccessor {
  @Input() id: string = `input-${Math.random().toString(36).substr(2, 9)}`;
  @Input() label: string = '';
  @Input() type: string = 'text';
  @Input() placeholder: string = '';
  @Input() error: string = '';
  @Input() disabled: boolean = false;

  value: string = '';

  onChange: any = () => {};
  onTouched: any = () => {};

  onInputChange(event: Event) {
    const target = event.target as HTMLInputElement;
    this.value = target.value;
    this.onChange(this.value);
  }

  writeValue(value: any): void {
    this.value = value || '';
  }

  registerOnChange(fn: any): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: any): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
  }
}
