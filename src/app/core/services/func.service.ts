
import { Injectable, inject } from '@angular/core';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class FuncService {
 
  toMySQLDateTime(date: Date): string {
    const pad = (n: number) => n.toString().padStart(2, '0');

    const yyyy = date.getFullYear();
    const mm = pad(date.getMonth() + 1);
    const dd = pad(date.getDate());
    const hh = pad(date.getHours());
    const ii = pad(date.getMinutes());
    const ss = pad(date.getSeconds());

    return `${yyyy}-${mm}-${dd} ${hh}:${ii}:${ss}`;
  }
}
