import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

interface LoginForm {
  email: string;
  password: string;
}

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);

  private readonly tokenKey = '8tt_auth_token';
  private readonly userKey = '8tt_auth_user';
  private readonly legacyTokenKey = 'tt_auth_token';
  private readonly legacyUserKey = 'tt_auth_user';

  private readonly currentUserSubject = new BehaviorSubject<any | null>(null);
  readonly currentUser$ = this.currentUserSubject.asObservable();

  get token(): string | null {
    return localStorage.getItem(this.tokenKey);
  }

  get currentUser(): any | null {
    return this.currentUserSubject.value;
  }

  get isAuthenticated(): boolean {
    return !!this.token;
  }

  bootstrapSession(): void {
    this.migrateLegacySession();

    const token = localStorage.getItem(this.tokenKey);
    const storedUser = localStorage.getItem(this.userKey);

    if (!token) {
      return;
    }

    if (storedUser) {
      try {
        this.currentUserSubject.next(JSON.parse(storedUser));
      } catch {
        this.currentUserSubject.next(null);
      }
    }

    this.fetchMe().subscribe();
  }

  login(payload: LoginForm): Observable<any> {
    return this.http
      .post<any>(`${environment.apiBaseUrl}/auth/login`, payload)
      .pipe(
        tap((response) => {
          const token = response?.data?.token;
          const user = response?.data?.user || null;

          if (!token) {
            return;
          }

          localStorage.setItem(this.tokenKey, token);

          if (user) {
            localStorage.setItem(this.userKey, JSON.stringify(user));
            this.currentUserSubject.next(user);
          }
        }),
      );
  }

  fetchMe(): Observable<any> {
    return this.http.get<any>(`${environment.apiBaseUrl}/auth/me`).pipe(
      tap((response) => {
        const user = response?.data || null;

        if (!user) {
          return;
        }

        localStorage.setItem(this.userKey, JSON.stringify(user));
        this.currentUserSubject.next(user);
      }),
      catchError(() => {
        this.currentUserSubject.next(null);
        return of(null);
      }),
    );
  }

  logout(redirectToLogin = true): void {
    this.clearSession(redirectToLogin);
  }

  private clearSession(redirectToLogin: boolean): void {
    localStorage.removeItem(this.tokenKey);
    localStorage.removeItem(this.userKey);
    localStorage.removeItem(this.legacyTokenKey);
    localStorage.removeItem(this.legacyUserKey);
    this.currentUserSubject.next(null);

    if (redirectToLogin) {
      void this.router.navigateByUrl('/login');
    }
  }

  initials(name: string | null | undefined): string {
    if (!name) {
      return 'NA';
    }

    const parts = name
      .split(' ')
      .map((part) => part.trim())
      .filter((part) => !!part);

    if (!parts.length) {
      return 'NA';
    }

    if (parts.length === 1) {
      return parts[0].slice(0, 2).toUpperCase();
    }

    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }

  private migrateLegacySession(): void {
    const legacyToken = localStorage.getItem(this.legacyTokenKey);
    const legacyUser = localStorage.getItem(this.legacyUserKey);

    if (!localStorage.getItem(this.tokenKey) && legacyToken) {
      localStorage.setItem(this.tokenKey, legacyToken);
    }

    if (!localStorage.getItem(this.userKey) && legacyUser) {
      localStorage.setItem(this.userKey, legacyUser);
    }

    if (legacyToken) {
      localStorage.removeItem(this.legacyTokenKey);
    }

    if (legacyUser) {
      localStorage.removeItem(this.legacyUserKey);
    }
  }

  decodeToken(): Record<string, any> | null {
    const token = this.token; // sudah ada getter-nya

    if (!token) {
      return null;
    }

    try {
      const payload = token.split('.')[1];
      const decoded = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
      return JSON.parse(decoded);
    } catch {
      return null;
    }
  }
}
