import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient, HttpContext } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap, catchError, throwError, finalize } from 'rxjs';
import { SKIP_ERROR_TOAST } from '../interceptors/http-context-tokens';
import { ToastService } from './toast.service';

export interface Usuario {
  id: string;
  email: string;
  nombre: string;
  apellido: string;
  telefono?: string;
  rol: 'admin' | 'cliente';
  activo: boolean;
  fecha_creacion?: string;
}

export interface AuthResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);
  private toast = inject(ToastService);
  private readonly API_URL = 'http://localhost:8000/api/v1/auth';

  // State using Signals
  private currentUserSignal = signal<Usuario | null>(null);
  private authResolvedSignal = signal(false);

  public readonly currentUser = this.currentUserSignal.asReadonly();
  public readonly authResolved = this.authResolvedSignal.asReadonly();
  public readonly isAuthenticated = computed(() => !!this.currentUserSignal());
  public readonly isAdmin = computed(() => this.currentUserSignal()?.rol === 'admin');

  constructor() {
    this.checkInitialAuth();
  }

  // --- Auth Actions ---

  login(credentials: any, skipErrorToast = false): Observable<AuthResponse> {
    const context = new HttpContext().set(SKIP_ERROR_TOAST, skipErrorToast);

    return this.http.post<AuthResponse>(`${this.API_URL}/login`, credentials, { context }).pipe(
      tap(res => {
        this.setTokens(res.access_token, res.refresh_token);
      })
    );
  }

  register(userData: any, skipErrorToast = false): Observable<any> {
    const context = new HttpContext().set(SKIP_ERROR_TOAST, skipErrorToast);
    return this.http.post(`${this.API_URL}/register`, userData, { context });
  }

  logout(): void {
    const refreshToken = this.getRefreshToken();
    if (refreshToken) {
      this.http.post(
        `${this.API_URL}/logout`,
        { refresh_token: refreshToken },
        { context: new HttpContext().set(SKIP_ERROR_TOAST, true) }
      ).subscribe({
        error: () => console.warn('Backend logout failed, but clearing local state anyway.')
      });
    }

    this.clearTokens();
    this.currentUserSignal.set(null);
    this.authResolvedSignal.set(true);
    this.toast.info('Has cerrado sesión correctamente.', 'Hasta pronto');
    this.router.navigate(['/auth/login']);
  }

  // --- Token Management ---

  getAccessToken(): string | null {
    return localStorage.getItem('access_token');
  }

  getRefreshToken(): string | null {
    return localStorage.getItem('refresh_token');
  }

  private setTokens(access_token: string, refresh_token: string): void {
    localStorage.setItem('access_token', access_token);
    localStorage.setItem('refresh_token', refresh_token);
  }

  private clearTokens(): void {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
  }

  // --- User Profile ---

  fetchCurrentUser(skipErrorToast = false): Observable<Usuario> {
    const context = new HttpContext().set(SKIP_ERROR_TOAST, skipErrorToast);

    return this.http.get<Usuario>(`${this.API_URL}/me`, { context }).pipe(
      tap(user => {
        this.currentUserSignal.set(user);
        this.authResolvedSignal.set(true);
      })
    );
  }

  updateProfile(profileData: { email?: string; nombre?: string; apellido?: string; telefono?: string }): Observable<Usuario> {
    return this.http.put<Usuario>(`${this.API_URL}/me`, profileData).pipe(
      tap(user => {
        this.currentUserSignal.set(user);
      })
    );
  }

  changePassword(payload: { current_password: string; new_password: string }): Observable<{ message: string }> {
    return this.http.put<{ message: string }>(`${this.API_URL}/me/password`, payload);
  }

  private checkInitialAuth(): void {
    if (this.getAccessToken()) {
      this.fetchCurrentUser(true).pipe(
        finalize(() => {
          this.authResolvedSignal.set(true);
        })
      ).subscribe({
        error: () => {
          // Si falla, el interceptor intentará hacer refresh.
          // Si el refresh falla, el interceptor limpiará la sesión.
        }
      });
      return;
    }

    this.authResolvedSignal.set(true);
  }

  // Refresh token method used by the interceptor
  refreshToken(): Observable<AuthResponse> {
    const refresh_token = this.getRefreshToken();
    if (!refresh_token) {
      return throwError(() => new Error('No refresh token available'));
    }

    return this.http.post<AuthResponse>(
      `${this.API_URL}/refresh`,
      { refresh_token },
      { context: new HttpContext().set(SKIP_ERROR_TOAST, true) }
    ).pipe(
      tap(res => {
        // Al renovar, el backend podría enviar un nuevo access_token y opcionalmente un nuevo refresh_token
        this.setTokens(res.access_token, res.refresh_token || refresh_token);
      }),
      catchError(err => {
        this.clearTokens();
        this.currentUserSignal.set(null);
        this.authResolvedSignal.set(true);
        this.router.navigate(['/auth/login']);
        return throwError(() => err);
      })
    );
  }
}
