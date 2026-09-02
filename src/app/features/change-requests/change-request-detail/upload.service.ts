// upload.service.ts
import { HttpClient, HttpEventType } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { UploadResponse } from './upload.model';

@Injectable({ providedIn: 'root' })
export class UploadService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = 'http://localhost:3000';

  uploadFiles(files: File[]): Observable<number | UploadResponse> {
    const formData = new FormData();
    files.forEach((file) => formData.append('files', file));

    return this.http.post<UploadResponse>(`${this.apiUrl}/upload`, formData, {
      reportProgress: true,
      observe: 'events',
    }).pipe(
      map((event) => {
        if (event.type === HttpEventType.UploadProgress && event.total) {
          return Math.round((event.loaded / event.total) * 100); // progress %
        }
        if (event.type === HttpEventType.Response) {
          return event.body as UploadResponse;
        }
        return 0;
      })
    );
  }
}