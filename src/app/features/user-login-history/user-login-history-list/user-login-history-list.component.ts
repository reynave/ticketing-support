import { CommonModule, DatePipe } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../../core/services/api.service';
import { NgbPagination, NgbTooltip } from '@ng-bootstrap/ng-bootstrap';

@Component({
  selector: 'app-user-login-history-list',
  standalone: true,
  imports: [CommonModule, FormsModule, FormsModule, NgbPagination, NgbTooltip],
  providers: [DatePipe],
  templateUrl: './user-login-history-list.component.html',
  styleUrl: './user-login-history-list.component.css',
})
export class UserLoginHistoryListComponent implements OnInit {
  private readonly apiService = inject(ApiService);
 apiUrl = 'https://crm.co.id/api/user-login-history';

  // status
  loading = false;
  errorMsg = '';

  // data
  allRows: any[] = [];
  viewRows: any[] = [];
  pageRows: any[] = [];
  userOptions: any[] = [];

  // filter
  fFrom = '';
  fTo = '';
  fUser = '';
  fFlag = '';
  fQ = '';

  // paging
  page = 1;
  pageSize = 15;

  // KPI
  totalLogin = 0;
  totalUser = 0;
  totalIp = 0;
  totalDays = 0;
  totalFlagged = 0;
  avgPerDay = '0';
  flaggedPct = '0';

  // chart & list
  dailyChart: any[] = [];
  hourChart: any[] = [];
  topUsers: any[] = [];
  browsers: any[] = [];

  // definisi flag
  flagList: any[] = [
    { key: 'night', label: 'Jam malam',      cls: 'text-bg-dark',    icon: 'bi-moon-stars',       desc: 'Login di luar 06:00–21:00', count: 0 },
    { key: 'rare',  label: 'IP jarang',      cls: 'text-bg-warning', icon: 'bi-geo-alt',          desc: 'IP hanya muncul 1–2 kali di seluruh data', count: 0 },
    { key: 'v6',    label: 'IPv6',           cls: 'text-bg-info',    icon: 'bi-hdd-network',      desc: 'Login via IPv6 (kemungkinan di luar jaringan kantor)', count: 0 },
    { key: 'burst', label: 'Login beruntun', cls: 'text-bg-danger',  icon: 'bi-lightning-charge', desc: '≥3 login user yang sama dalam 5 menit', count: 0 }
  ];
  flagMap: any = {};

  constructor() {
    this.flagList.forEach(f => (this.flagMap[f.key] = f));
  }

  ngOnInit(): void {
    this.load();
  }

  // ================= LOAD DATA =================
  load(): void {
    this.loading = true;
    this.errorMsg = '';
    this.apiService.get('/user-login-history').subscribe({
      next: res => {
        const arr = Array.isArray(res) ? res : (res && res.data) || [];
        this.allRows = this.prepare(arr);
        this.buildUserOptions();
        this.resetFilter();
        this.loading = false;
      },
      error: err => {
        this.loading = false;
        this.errorMsg = 'Gagal memuat data (' + (err.status || '') + ' ' + (err.statusText || '') + ')';
      }
    });
  }

  prepare(arr: any[]): any[] {
    const rows = arr.map(x => {
      const time: string = x.loginTime || '';
      return {
        id: x.id,
        userId: x.userId,
        userName: (x.userName || '').trim(),
        time: time,
        ip: x.ipAddress || '',
        browser: this.parseUA(x.userAgent || ''),
        date: time.slice(0, 10),
        hour: +time.slice(11, 13),
        ts: Date.parse(time.replace(' ', 'T')),
        flags: [] as string[]
      };
    });

    const ipCount: any = {};
    rows.forEach(r => (ipCount[r.ip] = (ipCount[r.ip] || 0) + 1));

    rows.forEach(r => {
      if (r.hour < 6 || r.hour >= 21) r.flags.push('night');
      if (ipCount[r.ip] <= 2) r.flags.push('rare');
      if (r.ip.includes(':')) r.flags.push('v6');
      const n = rows.filter(x => x.userId === r.userId && x.ts <= r.ts && r.ts - x.ts <= 300000).length;
      if (n >= 3) r.flags.push('burst');
    });

    return rows.sort((a, b) => b.ts - a.ts);
  }

  buildUserOptions(): void {
    const m: any = {};
    this.allRows.forEach(r => (m[r.userId] = r.userName));
    this.userOptions = Object.keys(m)
      .map(id => ({ id: id, name: m[id] }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  // ================= FILTER =================
  resetFilter(): void {
    const dates = this.allRows.map(r => r.date).sort();
    this.fFrom = dates[0] || '';
    this.fTo = dates[dates.length - 1] || '';
    this.fUser = '';
    this.fFlag = '';
    this.fQ = '';
    this.applyFilter();
  }

  applyFilter(): void {
    const q = this.fQ.trim().toLowerCase();
    this.viewRows = this.allRows.filter(r =>
      (!this.fFrom || r.date >= this.fFrom) &&
      (!this.fTo || r.date <= this.fTo) &&
      (!this.fUser || r.userId === this.fUser) &&
      (!this.fFlag || (this.fFlag === 'any' ? r.flags.length > 0 : r.flags.includes(this.fFlag))) &&
      (!q || (r.userName + ' ' + r.userId + ' ' + r.ip).toLowerCase().includes(q))
    );
    this.page = 1;
    this.computeStats();
    this.refreshPage();
  }

  filterByFlag(key: string): void {
    this.fFlag = key;
    this.applyFilter();
  }

  refreshPage(): void {
    const start = (this.page - 1) * this.pageSize;
    this.pageRows = this.viewRows.slice(start, start + this.pageSize);
  }

  // ================= STATISTIK =================
  computeStats(): void {
    const rows = this.viewRows;
    const days = new Set(rows.map(r => r.date)).size;

    this.totalLogin = rows.length;
    this.totalUser = new Set(rows.map(r => r.userId)).size;
    this.totalIp = new Set(rows.map(r => r.ip)).size;
    this.totalDays = days;
    this.totalFlagged = rows.filter(r => r.flags.length > 0).length;
    this.avgPerDay = days ? (rows.length / days).toFixed(1) : '0';
    this.flaggedPct = rows.length ? ((this.totalFlagged / rows.length) * 100).toFixed(0) : '0';

    // per hari
    const cntDay: any = {};
    rows.forEach(r => (cntDay[r.date] = (cntDay[r.date] || 0) + 1));
    const keys = Object.keys(cntDay).sort();
    const days2: any[] = [];
    if (keys.length) {
      const end = new Date(keys[keys.length - 1] + 'T00:00:00');
      for (let d = new Date(keys[0] + 'T00:00:00'); d <= end; d.setDate(d.getDate() + 1)) {
        const k = this.ymd(d);
        const n = cntDay[k] || 0;
        const wd = d.getDay();
        days2.push({ n: n, label: k.slice(8), cls: wd === 0 || wd === 6 ? 'weekend' : '', title: k + ': ' + n + ' login' });
      }
    }
    this.dailyChart = this.withPct(days2);

    // per jam
    const cntHour: number[] = Array(24).fill(0);
    rows.forEach(r => cntHour[r.hour]++);
    this.hourChart = this.withPct(
      cntHour.map((n, h) => ({
        n: n,
        label: String(h).padStart(2, '0'),
        cls: h < 6 || h >= 21 ? 'night' : '',
        title: String(h).padStart(2, '0') + ':00 – ' + n + ' login'
      }))
    );

    // top user
    const mUser: any = {};
    rows.forEach(r => (mUser[r.userName] = (mUser[r.userName] || 0) + 1));
    this.topUsers = this.toPctList(mUser).slice(0, 8);

    // browser
    const mBrowser: any = {};
    rows.forEach(r => (mBrowser[r.browser] = (mBrowser[r.browser] || 0) + 1));
    this.browsers = this.toPctList(mBrowser);

    // flag
    this.flagList.forEach(f => (f.count = rows.filter(r => r.flags.includes(f.key)).length));
  }

  withPct(list: any[]): any[] {
    const max = Math.max(...list.map(x => x.n), 1);
    list.forEach(x => (x.pct = (x.n / max) * 100));
    return list;
  }

  toPctList(m: any): any[] {
    const list = Object.keys(m).map(k => ({ label: k, n: m[k], pct: 0 })).sort((a, b) => b.n - a.n);
    const max = list.length ? list[0].n : 1;
    list.forEach(x => (x.pct = (x.n / max) * 100));
    return list;
  }

  // ================= HELPER =================
  parseUA(ua: string): string {
    const f = /Firefox\/(\d+)/.exec(ua); if (f) return 'Firefox ' + f[1];
    const e = /Edg\/(\d+)/.exec(ua);     if (e) return 'Edge ' + e[1];
    const c = /Chrome\/(\d+)/.exec(ua);  if (c) return 'Chrome ' + c[1];
    if (/Safari/.test(ua)) return 'Safari' + (/iPhone/.test(ua) ? ' (iPhone)' : '');
    return 'Lainnya';
  }

  browserIcon(b: string): string {
    if (b.startsWith('Chrome')) return 'bi-browser-chrome';
    if (b.startsWith('Firefox')) return 'bi-browser-firefox';
    if (b.startsWith('Safari')) return 'bi-browser-safari';
    if (b.startsWith('Edge')) return 'bi-browser-edge';
    return 'bi-globe';
  }

  ymd(d: Date): string {
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }

 

  exportCsv(): void {
    const q = (v: any) => '"' + String(v).replace(/"/g, '""') + '"';
    const lines = ['ID,Waktu Login,User ID,Nama,IP,Browser,Flag'].concat(
      this.viewRows.map(r =>
        [r.id, r.time, r.userId, r.userName, r.ip, r.browser, r.flags.map((k: string) => this.flagMap[k].label).join('; ')]
          .map(q).join(',')
      )
    );
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob(['﻿' + lines.join('\n')], { type: 'text/csv;charset=utf-8' }));
    a.download = 'login-history.csv';
    a.click();
    URL.revokeObjectURL(a.href);
  }
}
