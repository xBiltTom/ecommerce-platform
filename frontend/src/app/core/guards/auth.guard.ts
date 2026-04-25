import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { map, take, catchError, of } from 'rxjs';

// Guard para rutas de clientes autenticados
export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  // Si ya sabemos que está autenticado a través del signal
  if (authService.isAuthenticated()) {
    return true;
  }

  // Si no está cargado en el signal pero tiene token, intentamos cargar el perfil
  if (authService.getAccessToken()) {
    return authService.fetchCurrentUser().pipe(
      take(1),
      map(() => true),
      catchError(() => {
        router.navigate(['/auth/login'], { queryParams: { returnUrl: state.url } });
        return of(false);
      })
    );
  }

  // No hay token, redirigir
  router.navigate(['/auth/login'], { queryParams: { returnUrl: state.url } });
  return false;
};

// Guard específico para rutas administrativas
export const adminGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isAdmin()) {
    return true;
  }

  if (authService.getAccessToken()) {
    return authService.fetchCurrentUser().pipe(
      take(1),
      map(user => {
        if (user.rol === 'admin') {
          return true;
        }
        router.navigate(['/']); // Redirigir al inicio si no es admin
        return false;
      }),
      catchError(() => {
        router.navigate(['/auth/login']);
        return of(false);
      })
    );
  }

  router.navigate(['/auth/login']);
  return false;
};

// Guard para prevenir que usuarios autenticados entren a Login/Register
export const guestGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.getAccessToken()) {
    router.navigate(['/']);
    return false;
  }
  
  return true;
};
