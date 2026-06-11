import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class ApiService {
  private readonly http = inject(HttpClient);

  get(path: string, query: Record<string, string | number | boolean | null | undefined> = {}): Observable<any> {
    return this.http.get<any>(`${environment.apiBaseUrl}${path}`, {
      params: this.buildParams(query),
    });
  }

  post(path: string, body: any): Observable<any> {
    return this.http.post<any>(`${environment.apiBaseUrl}${path}`, body);
  }

  put(path: string, body: any): Observable<any> {
    return this.http.put<any>(`${environment.apiBaseUrl}${path}`, body);
  }

  delete(path: string): Observable<any> {
    return this.http.delete<any>(`${environment.apiBaseUrl}${path}`);
  }

  private buildParams(query: Record<string, string | number | boolean | null | undefined>): HttpParams {
    let params = new HttpParams();

    Object.keys(query).forEach((key) => {
      const value = query[key];

      if (value === undefined || value === null || value === '') {
        return;
      }

      params = params.set(key, String(value));
    });

    return params;
  }
}
