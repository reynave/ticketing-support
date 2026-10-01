import { Component } from '@angular/core';

@Component({
  selector: 'app-users-report',
  standalone: true,
  imports: [],
  templateUrl: './users-report.component.html',
  styleUrl: './users-report.component.css'
})
export class UsersReportComponent {
 filter: any = { from: '2026-09-01', to: '2026-09-30' };
 
  kpis: any = [
    { label: 'Total Case', value: '105' },
    { label: 'Closed', value: '91' },
    { label: 'Total Actual Hr', value: '517.9' },
    { label: 'Avg Actual Hr / Case', value: '4.9' },
    { label: 'Efisiensi', value: '105%' },
    { label: 'Avg Rating', value: '4.5 ★' },
  ];
 
  employees: any = [
    { id: 1, initial: 'AP', name: 'Andi Pratama',  division: 'Support',     totalCase: 24, closed: 21, inProgress: 3, actual: 96.5,  avg: 4.0, target: 110, eff: 114, effOk: true,  ontime: 92, rating: 4.6, barActual: 60, barTarget: 69 },
    { id: 2, initial: 'BS', name: 'Budi Santoso',  division: 'Support',     totalCase: 18, closed: 15, inProgress: 3, actual: 88.2,  avg: 4.9, target: 84,  eff: 95,  effOk: false, ontime: 80, rating: 4.2, barActual: 55, barTarget: 53 },
    { id: 3, initial: 'CL', name: 'Citra Lestari', division: 'Implementor', totalCase: 31, closed: 28, inProgress: 3, actual: 142.8, avg: 4.6, target: 160, eff: 112, effOk: true,  ontime: 95, rating: 4.8, barActual: 89, barTarget: 100 },
    { id: 4, initial: 'DF', name: 'Dewi Fortuna',  division: 'Implementor', totalCase: 12, closed: 9,  inProgress: 3, actual: 70.4,  avg: 5.9, target: 60,  eff: 85,  effOk: false, ontime: 66, rating: 3.9, barActual: 44, barTarget: 38 },
    { id: 5, initial: 'EW', name: 'Eko Wijaya',    division: 'Developer',   totalCase: 20, closed: 18, inProgress: 2, actual: 120.0, avg: 6.0, target: 132, eff: 110, effOk: true,  ontime: 89, rating: 4.4, barActual: 75, barTarget: 83 },
  ];
 
  total: any = { totalCase: 105, closed: 91, inProgress: 14, actual: 517.9, avg: 4.9, target: 546, eff: 105, ontime: 88, rating: 4.5 };
}
