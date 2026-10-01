import { Component } from '@angular/core';

@Component({
  selector: 'app-user-detail-report',
  standalone: true,
  imports: [],
  templateUrl: './user-detail-report.component.html',
  styleUrl: './user-detail-report.component.css'
})
export class UserDetailReportComponent {
 filter: any = { from: '2026-09-01', to: '2026-09-30' };

  employee: any = { initial: 'AP', name: 'Andi Pratama', division: 'Support', position: 'Support Engineer', id: 'USR-A9F434EE' };

  kpis: any = [
    { label: 'Total Tiket', value: '7' },
    { label: 'Closed', value: '5' },
    { label: 'Total Actual Hr', value: '94.5' },
    { label: 'Avg Actual Hr', value: '13.5' },
    { label: 'Efisiensi', value: '121%' },
    { label: 'On-time', value: '60%' },
    { label: 'Avg Rating', value: '4.2 ★' },
  ];

  weekly: any = [
    { label: 'Mgg 1', hours: 12.5, pct: 27 },
    { label: 'Mgg 2', hours: 24.0, pct: 51 },
    { label: 'Mgg 3', hours: 46.8, pct: 100 },
    { label: 'Mgg 4', hours: 31.2, pct: 67 },
    { label: 'Mgg 5', hours: 10.0, pct: 21 },
  ];

  categories: any = [
    { name: 'Configuration', count: 2, pct: 100 },
    { name: 'Blueprint', count: 2, pct: 100 },
    { name: 'Deployement', count: 1, pct: 50 },
    { name: 'SIT & UAT', count: 1, pct: 50 },
    { name: 'Training', count: 1, pct: 50 },
  ];

  tickets: any = [
    { no: 'IS000073', title: 'Error posting jurnal',        category: 'Configuration', type: 'Case',                complexity: 'Medium',  target: 8,  actual: 6.5,  actualOk: true,  deadline: '2026-09-05', done: '2026-09-04', ontime: 'Ya',    ontimeOk: true,  status: 'Closed',      statusCls: 'text-bg-success', rating: '5 ★' },
    { no: 'IS000074', title: 'Laporan stok tidak muncul',   category: 'Blueprint',     type: 'Case',                complexity: 'Simple',  target: 6,  actual: 7.2,  actualOk: false, deadline: '2026-09-08', done: '2026-09-09', ontime: 'Telat', ontimeOk: false, status: 'Closed',      statusCls: 'text-bg-success', rating: '3 ★' },
    { no: 'TA000061', title: 'Setup user client baru',      category: 'Deployement',   type: 'Task',                complexity: 'Simple',  target: 6,  actual: 4.0,  actualOk: true,  deadline: '2026-09-10', done: '2026-09-10', ontime: 'Ya',    ontimeOk: true,  status: 'Closed',      statusCls: 'text-bg-success', rating: '4 ★' },
    { no: 'IS000078', title: 'Integrasi API pembayaran',    category: 'SIT & UAT',     type: 'Case',                complexity: 'Complex', target: 40, actual: 36.5, actualOk: true,  deadline: '2026-09-18', done: '2026-09-17', ontime: 'Ya',    ontimeOk: true,  status: 'Closed',      statusCls: 'text-bg-success', rating: '5 ★' },
    { no: 'CR000012', title: 'Tambah field di form PO',     category: 'Configuration', type: 'Change Request (CR)', complexity: 'Medium',  target: 8,  actual: 9.0,  actualOk: false, deadline: '2026-09-22', done: '2026-09-24', ontime: 'Telat', ontimeOk: false, status: 'Closed',      statusCls: 'text-bg-success', rating: '4 ★' },
    { no: 'IS000081', title: 'Performa query lambat',       category: 'Training',      type: 'Case',                complexity: 'Complex', target: 40, actual: 28.3, actualOk: true,  deadline: '2026-10-02', done: '-',          ontime: '-',     ontimeOk: true,  status: 'In Progress', statusCls: 'text-bg-warning', rating: '-' },
    { no: 'TA000064', title: 'Dokumentasi modul inventory', category: 'Blueprint',     type: 'Task',                complexity: 'Simple',  target: 6,  actual: 3.0,  actualOk: true,  deadline: '2026-10-05', done: '-',          ontime: '-',     ontimeOk: true,  status: 'In Progress', statusCls: 'text-bg-warning', rating: '-' },
  ];

  total: any = { count: 7, target: 114, actual: 94.5, rating: '4.2 ★' };
}
