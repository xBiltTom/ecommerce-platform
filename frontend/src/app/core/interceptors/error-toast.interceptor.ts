import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { ToastService } from '../services/toast.service';
import { SKIP_ERROR_TOAST } from './http-context-tokens';

export const errorToastInterceptor: HttpInterceptorFn = (req, next) => {
  const toast = inject(ToastService);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      if (req.context.get(SKIP_ERROR_TOAST)) {
        return throwError(() => error);
      }

      const isRefreshError = req.url.includes('/auth/refresh');
      const isLoginError = req.url.includes('/auth/login');

      if (!isRefreshError && !isLoginError) {
        const message = resolveErrorMessage(error);

        if (message) {
          toast.error(message);
        }
      }

      return throwError(() => error);
    })
  );
};

function resolveErrorMessage(error: HttpErrorResponse): string {
  if (error.error && typeof error.error === 'object' && 'detail' in error.error) {
    const detail = (error.error as { detail?: unknown }).detail;
    if (typeof detail === 'string' && detail.trim().length > 0) {
      return detail;
    }
  }

  if (error.status === 0) {
    return 'No se pudo conectar con el servidor. Verifica tu conexión o backend.';
  }

  if (error.status === 401) {
    return 'Tu sesión no es válida. Inicia sesión nuevamente.';
  }

  if (error.status === 403) {
    return 'No tienes permisos para realizar esta acción.';
  }

  if (error.status === 404) {
    return 'El recurso solicitado no existe.';
  }

  if (error.status === 422) {
    return 'Los datos enviados no son válidos.';
  }

  if (error.status >= 500) {
    return 'Error interno del servidor. Intenta nuevamente en unos minutos.';
  }

  return 'Ocurrió un error inesperado al procesar la solicitud.';
}
