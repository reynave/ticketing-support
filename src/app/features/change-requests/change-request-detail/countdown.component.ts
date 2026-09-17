import { Component, Input, OnInit, OnChanges, OnDestroy, SimpleChanges, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-countdown',
  standalone: true,
  imports: [CommonModule],
  template: `
   
    <span class="countdown" [class.overdue]="isOverdue" *ngIf="isValid; else invalidTpl">
      <span *ngIf="isOverdue">+</span>
      <span *ngIf="days !== '00'">{{ days }} day{{ days !== '01' ? 's' : '' }} </span>
      <span>{{ hours }}</span>:<span>{{ minutes }}</span>:<span>{{ seconds }}</span>
    </span>
    <ng-template #invalidTpl>
      <span class="countdown-invalid">--:--:--</span>
    </ng-template>
  `,
  styles: [`
    .countdown { 
      font-family: monospace;
    }
    .countdown.overdue {
      color: #d33;
    }
    .countdown-invalid { 
      color: #999;
    }
  `]
})
export class CountdownComponent implements OnInit, OnChanges, OnDestroy {
  @Input() totalSeconds: number | null = null;
  @Input() targetDate: string | Date | null = null;

  @Output() finished = new EventEmitter<void>();

  remaining: number = 0;
  isValid: boolean = false;
  isOverdue: boolean = false;
  days: string = '00';
  hours: string = '00';
  minutes: string = '00';
  seconds: string = '00';

  private intervalId: any = null;
  private targetTime: number = 0;
  private isDateMode: boolean = false;
  private hasFinished: boolean = false;

  ngOnInit(): void {
    this.setup();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['targetDate'] || changes['totalSeconds']) {
      this.setup();
    }
  }

  private setup(): void {
    this.stop();
    this.isValid = false;
    this.isOverdue = false;
    this.hasFinished = false;

    if (this.targetDate) {
      const parsed = new Date(this.targetDate);

      if (isNaN(parsed.getTime())) {
        console.warn('CountdownComponent: targetDate tidak valid ->', this.targetDate);
        return;
      }

      this.isDateMode = true;
      this.targetTime = parsed.getTime();
      this.remaining = Math.floor((this.targetTime - Date.now()) / 1000);
    } else if (this.totalSeconds !== null && this.totalSeconds !== undefined) {
      this.isDateMode = false;
      this.remaining = this.totalSeconds;
    } else {
      return;
    }

    this.isValid = true;
    this.updateDisplay();
    this.start();
  }

  start(): void {
    this.intervalId = setInterval(() => {
      if (this.isDateMode) {
        this.remaining = Math.floor((this.targetTime - Date.now()) / 1000);
      } else {
        this.remaining--;
      }

      if (this.remaining <= 0 && !this.hasFinished) {
        this.hasFinished = true;
        this.finished.emit();
      }

      this.isOverdue = this.remaining <= 0;
      this.updateDisplay();
      // interval TIDAK di-stop, biar terus jalan hitung kelebihannya
    }, 1000);
  }

  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  private updateDisplay(): void {
    const total = Math.abs(this.remaining);

    const d = Math.floor(total / 86400);
    const h = Math.floor((total % 86400) / 3600);
    const m = Math.floor((total % 3600) / 60);
    const s = total % 60;

    this.days = this.pad(d);
    this.hours = this.pad(h);
    this.minutes = this.pad(m);
    this.seconds = this.pad(s);
  }

  private pad(val: number): string {
    return val.toString().padStart(2, '0');
  }

  ngOnDestroy(): void {
    this.stop();
  }
}