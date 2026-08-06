import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { io, Socket } from 'socket.io-client';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class SocketNotificationService {
  private socket?: Socket;

  emitReloadAction(): void {
    this.getSocket().emit('notification', { action: 'reload' });
  }

  onReloadAction(): Observable<void> {
    return new Observable<void>((subscriber) => {
      const client = this.getSocket();
      const handler = (payload: any) => {
        if (payload?.action === 'reload') {
          subscriber.next();
        }
      };

      client.on('notification', handler);

      return () => {
        client.off('notification', handler);
      };
    });
  }

  private getSocket(): Socket {
    if (this.socket) {
      return this.socket;
    }

    const socketBaseUrl = environment.apiBaseUrl.replace(/\/api\/?$/, '');

    this.socket = io(socketBaseUrl, {
      transports: ['websocket', 'polling'],
    });

    return this.socket;
  }
}
