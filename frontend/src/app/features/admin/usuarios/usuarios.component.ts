import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AdminService } from '../../../core/services/admin.service';
import { LucideAngularModule, Edit2, Trash2, CheckCircle, XCircle } from 'lucide-angular';
import { ButtonComponent } from '../../../shared/components/button/button.component';

@Component({
  selector: 'app-admin-usuarios',
  standalone: true,
  imports: [CommonModule, LucideAngularModule, ButtonComponent],
  template: `
    <div class="space-y-6">
      <div class="flex items-center justify-between">
        <div>
          <h2 class="text-2xl font-bold text-text-primary">Gestión de Usuarios</h2>
          <p class="text-text-secondary mt-1">Administra los clientes y administradores del sistema.</p>
        </div>
      </div>

      <div class="bg-bg-surface border border-border-subtle rounded-card overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full text-left text-sm whitespace-nowrap">
            <thead class="bg-bg-main border-b border-border-subtle text-text-secondary">
              <tr>
                <th class="px-6 py-4 font-medium">Nombre</th>
                <th class="px-6 py-4 font-medium">Email</th>
                <th class="px-6 py-4 font-medium">Rol</th>
                <th class="px-6 py-4 font-medium">Estado</th>
                <th class="px-6 py-4 font-medium text-right">Acciones</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-border-subtle">
              <tr *ngFor="let user of usuarios()" class="hover:bg-bg-surface-hover transition-colors">
                <td class="px-6 py-4">
                  <div class="flex items-center gap-3">
                    <div class="w-8 h-8 rounded-full bg-accent-primary/20 flex items-center justify-center text-accent-primary font-bold text-xs">
                      {{ user.nombre.charAt(0) }}{{ user.apellido.charAt(0) }}
                    </div>
                    <span class="font-medium text-text-primary">{{ user.nombre }} {{ user.apellido }}</span>
                  </div>
                </td>
                <td class="px-6 py-4 text-text-secondary">{{ user.email }}</td>
                <td class="px-6 py-4">
                  <span class="px-2.5 py-1 text-xs rounded-sm font-medium" 
                        [ngClass]="user.rol === 'admin' ? 'bg-purple-500/10 text-purple-400' : 'bg-blue-500/10 text-blue-400'">
                    {{ user.rol | uppercase }}
                  </span>
                </td>
                <td class="px-6 py-4">
                  <div class="flex items-center gap-1.5" [ngClass]="user.activo ? 'text-green-400' : 'text-red-400'">
                    <lucide-icon [img]="user.activo ? CheckCircle : XCircle" [size]="14"></lucide-icon>
                    <span>{{ user.activo ? 'Activo' : 'Baneado' }}</span>
                  </div>
                </td>
                <td class="px-6 py-4 text-right">
                  <div class="flex items-center justify-end gap-2">
                    <button class="p-2 text-text-secondary hover:text-accent-primary transition-colors cursor-pointer rounded-sm hover:bg-accent-primary/10">
                      <lucide-icon [img]="Edit2" [size]="16"></lucide-icon>
                    </button>
                  </div>
                </td>
              </tr>
              
              <!-- Empty State -->
              <tr *ngIf="usuarios().length === 0 && !loading()">
                <td colspan="5" class="px-6 py-12 text-center text-text-secondary">
                  No hay usuarios registrados.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `,
  styles: []
})
export class AdminUsuariosComponent implements OnInit {
  private adminService = inject(AdminService);
  
  readonly Edit2 = Edit2;
  readonly Trash2 = Trash2;
  readonly CheckCircle = CheckCircle;
  readonly XCircle = XCircle;

  usuarios = signal<any[]>([]);
  loading = signal(true);

  ngOnInit() {
    this.cargarUsuarios();
  }

  cargarUsuarios() {
    this.adminService.getUsuarios().subscribe({
      next: (data) => {
        // En una app real data.items, aquí mockeamos si no hay data real para ver la UI
        this.usuarios.set(data.items || data);
        this.loading.set(false);
      },
      error: () => {
        // Mock fallback para la UI
        this.usuarios.set([
          { id: '1', nombre: 'Admin', apellido: 'Sistema', email: 'admin@ecommerce.com', rol: 'admin', activo: true },
          { id: '2', nombre: 'Juan', apellido: 'Perez', email: 'juan@gmail.com', rol: 'cliente', activo: true },
          { id: '3', nombre: 'Maria', apellido: 'Gomez', email: 'maria@hotmail.com', rol: 'cliente', activo: false }
        ]);
        this.loading.set(false);
      }
    });
  }
}
