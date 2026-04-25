import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap, catchError, throwError, map, of } from 'rxjs';

export interface Usuario {
  id: string;
  email: string;
  nombre: string;
  apellido: string;
  telefono?: string;
  rol: 'admin' | 'cliente';
  activo: boolean;
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
  private readonly API_URL = 'http://localhost:8000/api/v1/auth';

  // State using Signals
  private currentUserSignal = signal<Usuario | null>(null);
  
  public readonly currentUser = this.currentUserSignal.asReadonly();
  public readonly isAuthenticated = computed(() => !!this.currentUserSignal());
  public readonly isAdmin = computed(() => this.currentUserSignal()?.rol === 'admin');

  constructor() {
    this.checkInitialAuth();
  }

  // --- Auth Actions ---

  login(credentials: any): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.API_URL}/login`, credentials).pipe(
      tap(res => {
        this.setTokens(res.access_token, res.refresh_token);
      })
    );
  }

  register(userData: any): Observable<any> {
    return this.http.post(`${this.API_URL}/register`, userData);
  }

  logout(): void {
    // Optionally call backend to invalidate refresh token
    const token = this.getAccessToken();
    if (token) {
      this.http.post(`${this.API_URL}/logout`, {}).subscribe({
        error: () => console.warn('Backend logout failed, but clearing local state anyway.')
      });
    }
    
    this.clearTokens();
    this.currentUserSignal.set(null);
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

  fetchCurrentUser(): Observable<Usuario> {
    return this.http.get<Usuario>(`${this.API_URL}/me`).pipe(
      tap(user => {
        this.currentUserSignal.set(user);
      })
    );
  }

  private checkInitialAuth(): void {
    if (this.getAccessToken()) {
      this.fetchCurrentUser().subscribe({
        error: () => {
          // Si falla, el interceptor intentará hacer refresh.
          // Si el refresh falla, el interceptor limpiará la sesión.
        }
      });
    }
  }

  // Refresh token method used by the interceptor
  refreshToken(): Observable<AuthResponse> {
    const refresh_token = this.getRefreshToken();
    if (!refresh_token) {
      return throwError(() => new Error('No refresh token available'));
    }

    return this.http.post<AuthResponse>(`${this.API_URL}/refresh`, { refresh_token }).pipe(
      tap(res => {
        // Al renovar, el backend podría enviar un nuevo access_token y opcionalmente un nuevo refresh_token
        this.setTokens(res.access_token, res.refresh_token || refresh_token);
      }),
      catchError(err => {
        this.clearTokens();
        this.currentUserSignal.set(null);
        this.router.navigate(['/auth/login']);
        return throwError(() => err);
      })
    );
  }
}
