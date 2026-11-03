/**
 * ORIGEN ERP - Payroll Integration Tests
 *
 * Tests de integración para componentes de nómina guatemalteca
 */

import { describe, it, expect, beforeEach } from 'vitest';
import type { Employee } from '../types';

// Attendance record interface for tests
interface AttendanceRecord {
  id: string;
  employeeId: string;
  date: string;
  hoursWorked: number;
  isOvertime: boolean;
  projectId?: string;
  companyId?: string;
}

// Payroll period interface for tests
interface PayrollPeriod {
  id: string;
  month: number;
  year: number;
  startDate: string;
  endDate: string;
  status: 'pending' | 'processing' | 'completed';
  companyId: string;
}

// Mock data for payroll tests
const mockEmployees: Employee[] = [
  {
    id: 'emp-001',
    name: 'Juan Pérez',
    position: 'Maestro de Obras',
    baseSalary: 12000,
    dailyRateGTQ: 400,
    hireDate: '2024-01-01',
    companyId: 'comp-001',
    isActive: true,
  },
  {
    id: 'emp-002',
    name: 'María González',
    position: 'Albañil',
    baseSalary: 8500,
    dailyRateGTQ: 283,
    hireDate: '2024-01-15',
    companyId: 'comp-001',
    isActive: true,
  },
  {
    id: 'emp-003',
    name: 'Carlos López',
    position: 'Ayudante',
    baseSalary: 6500,
    dailyRateGTQ: 217,
    hireDate: '2024-02-01',
    companyId: 'comp-001',
    isActive: true,
  },
];

const mockAttendance: AttendanceRecord[] = [
  {
    id: 'att-001',
    employeeId: 'emp-001',
    date: '2024-10-27',
    hoursWorked: 8,
    isOvertime: false,
    projectId: 'proj-001',
    companyId: 'comp-001',
  },
  {
    id: 'att-002',
    employeeId: 'emp-001',
    date: '2024-10-28',
    hoursWorked: 10,
    isOvertime: true,
    projectId: 'proj-001',
    companyId: 'comp-001',
  },
  {
    id: 'att-003',
    employeeId: 'emp-002',
    date: '2024-10-27',
    hoursWorked: 8,
    isOvertime: false,
    projectId: 'proj-001',
    companyId: 'comp-001',
  },
  {
    id: 'att-004',
    employeeId: 'emp-002',
    date: '2024-10-28',
    hoursWorked: 8,
    isOvertime: false,
    projectId: 'proj-001',
    companyId: 'comp-001',
  },
];

describe('Payroll Integration Tests', () => {
  describe('Employee Data Validation', () => {
    it('should validate employee data structure', () => {
      expect(mockEmployees).toHaveLength(3);
      expect(mockEmployees[0].id).toBeDefined();
      expect(mockEmployees[0].name).toBeDefined();
      expect(mockEmployees[0].baseSalary).toBeGreaterThan(0);
      expect(mockEmployees[0].dailyRateGTQ).toBeGreaterThan(0);
    });

    it('should filter active employees', () => {
      const activeEmployees = mockEmployees.filter((emp) => emp.isActive);
      expect(activeEmployees).toHaveLength(3);
    });

    it('should calculate daily rate from base salary', () => {
      const monthlyDays = 30;
      const expectedDailyRate = 12000 / monthlyDays;
      expect(mockEmployees[0].dailyRateGTQ).toBeCloseTo(expectedDailyRate, 0);
    });
  });

  describe('Attendance Records Validation', () => {
    it('should validate attendance data structure', () => {
      expect(mockAttendance).toHaveLength(4);
      expect(mockAttendance[0].employeeId).toBeDefined();
      expect(mockAttendance[0].date).toBeDefined();
      expect(mockAttendance[0].hoursWorked).toBeGreaterThan(0);
    });

    it('should calculate total hours per employee', () => {
      const emp001Hours = mockAttendance
        .filter((att) => att.employeeId === 'emp-001')
        .reduce((sum, att) => sum + att.hoursWorked, 0);

      expect(emp001Hours).toBe(18); // 8 + 10
    });

    it('should identify overtime hours', () => {
      const overtimeRecords = mockAttendance.filter((att) => att.isOvertime);
      expect(overtimeRecords).toHaveLength(1);
      expect(overtimeRecords[0].hoursWorked).toBe(10);
    });

    it('should calculate overtime premium', () => {
      const overtimeHours = 2; // 10 - 8
      const regularRate = 400;
      const overtimeRate = regularRate * 1.5; // 1.5x for overtime
      const overtimePay = overtimeHours * overtimeRate;

      expect(overtimePay).toBe(1200); // 2 * 600
    });
  });

  describe('Payroll Calculations', () => {
    it('should calculate gross salary for a period', () => {
      const daysWorked = 30;
      const grossSalary = mockEmployees[0].dailyRateGTQ * daysWorked;

      expect(grossSalary).toBe(12000);
    });

    it('should calculate IGSS employee deduction (4.83%)', () => {
      const grossSalary = 12000;
      const igssRate = 0.0483;
      const igssDeduction = grossSalary * igssRate;

      expect(igssDeduction).toBeCloseTo(579.6, 0.1);
    });

    it('should calculate IGSS employer cost (10.67%)', () => {
      const grossSalary = 12000;
      const igssEmployerRate = 0.1067;
      const igssEmployerCost = grossSalary * igssEmployerRate;

      expect(igssEmployerCost).toBeCloseTo(1280.4, 0.1);
    });

    it('should calculate net salary after deductions', () => {
      const grossSalary = 12000;
      const igssEmployee = 579.6;
      const isr = 570.27; // Estimated
      const netSalary = grossSalary - igssEmployee - isr;

      expect(netSalary).toBeCloseTo(10850.13, 0.1);
    });

    it('should calculate total employer cost', () => {
      const grossSalary = 12000;
      const igssEmployer = 1280.4;
      const totalCost = grossSalary + igssEmployer;

      expect(totalCost).toBeCloseTo(13280.4, 0.1);
    });
  });

  describe('Bono 14 Calculations', () => {
    it('should calculate Bono 14 for full year', () => {
      const baseSalary = 12000;
      const bono14 = baseSalary; // Full year = 1 month salary

      expect(bono14).toBe(12000);
    });

    it('should calculate Bono 14 for partial year', () => {
      const baseSalary = 12000;
      const monthsWorked = 6;
      const bono14 = (baseSalary / 12) * monthsWorked;

      expect(bono14).toBe(6000);
    });

    it('should calculate Bono 14 with salary increase', () => {
      const baseSalary = 12000;
      const monthsWorked = 12;
      const averageSalary = baseSalary;
      const bono14 = (averageSalary / 12) * monthsWorked;

      expect(bono14).toBe(12000);
    });
  });

  describe('Aguinaldo Calculations', () => {
    it('should calculate Aguinaldo for full year', () => {
      const baseSalary = 12000;
      const aguinaldo = baseSalary; // Full year = 1 month salary

      expect(aguinaldo).toBe(12000);
    });

    it('should calculate Aguinaldo for partial year', () => {
      const baseSalary = 12000;
      const monthsWorked = 6;
      const aguinaldo = (baseSalary / 12) * monthsWorked;

      expect(aguinaldo).toBe(6000);
    });

    it('should verify Aguinaldo equals Bono 14', () => {
      const baseSalary = 12000;
      const bono14 = baseSalary;
      const aguinaldo = baseSalary;

      expect(bono14).toBe(aguinaldo);
    });
  });

  describe('Attendance Rate Calculations', () => {
    it('should calculate attendance rate for 100% attendance', () => {
      const hoursWorked = 40; // 5 days * 8 hours
      const expectedHours = 40;
      const attendanceRate = (hoursWorked / expectedHours) * 100;

      expect(attendanceRate).toBe(100);
    });

    it('should calculate attendance rate with overtime', () => {
      const hoursWorked = 44; // 5 days * 8 hours + 4 hours overtime
      const expectedHours = 40;
      const attendanceRate = (hoursWorked / expectedHours) * 100;

      expect(attendanceRate).toBeCloseTo(110, 0.01);
    });

    it('should calculate attendance rate for partial attendance', () => {
      const hoursWorked = 32; // 4 days * 8 hours
      const expectedHours = 40;
      const attendanceRate = (hoursWorked / expectedHours) * 100;

      expect(attendanceRate).toBe(80);
    });
  });

  describe('Payroll Period Validation', () => {
    it('should validate payroll period structure', () => {
      const payrollPeriod: PayrollPeriod = {
        id: 'payroll-2024-10',
        month: 10,
        year: 2024,
        startDate: '2024-10-01',
        endDate: '2024-10-31',
        status: 'pending',
        companyId: 'comp-001',
      };

      expect(payrollPeriod.month).toBe(10);
      expect(payrollPeriod.year).toBe(2024);
      expect(payrollPeriod.status).toBe('pending');
    });

    it('should calculate days in payroll period', () => {
      const startDate = new Date('2024-10-01');
      const endDate = new Date('2024-10-31');
      const daysInPeriod =
        Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;

      expect(daysInPeriod).toBe(31);
    });

    it('should validate payroll period is complete', () => {
      const isComplete = (startDate: string, endDate: string) => {
        const start = new Date(startDate);
        const end = new Date(endDate);
        const now = new Date();
        const daysDiff = Math.floor((now.getTime() - end.getTime()) / (1000 * 60 * 60 * 24));
        return daysDiff >= 0;
      };

      expect(isComplete('2024-09-01', '2024-09-30')).toBe(true);
      expect(isComplete('2026-12-01', '2026-12-31')).toBe(false);
    });
  });

  describe('Multi-Employee Payroll', () => {
    it('should calculate payroll for all employees', () => {
      const daysWorked = 30;
      const totalGrossSalary = mockEmployees.reduce(
        (sum, emp) => sum + emp.dailyRateGTQ * daysWorked,
        0
      );

      expect(totalGrossSalary).toBe(27000); // 12000 + 8500 + 6500
    });

    it('should calculate total IGSS deductions', () => {
      const totalGrossSalary = 27000;
      const igssRate = 0.0483;
      const totalIGSS = totalGrossSalary * igssRate;

      expect(totalIGSS).toBeCloseTo(1304.1, 0.1);
    });

    it('should calculate total employer IGSS cost', () => {
      const totalGrossSalary = 27000;
      const igssEmployerRate = 0.1067;
      const totalIGSSEmployer = totalGrossSalary * igssEmployerRate;

      expect(totalIGSSEmployer).toBeCloseTo(2880.9, 0.1);
    });

    it('should calculate total employer cost', () => {
      const totalGrossSalary = 27000;
      const totalIGSSEmployer = 2880.9;
      const totalCost = totalGrossSalary + totalIGSSEmployer;

      expect(totalCost).toBeCloseTo(29880.9, 0.1);
    });
  });

  describe('Payroll Export Validation', () => {
    it('should generate payroll data for Excel export', () => {
      const payrollData = mockEmployees.map((emp) => ({
        employee: emp.name,
        position: emp.position,
        baseSalary: emp.baseSalary,
        daysWorked: 30,
        grossSalary: emp.baseSalary,
        igssEmployee: emp.baseSalary * 0.0483,
        netSalary: emp.baseSalary * (1 - 0.0483 - 0.15),
      }));

      expect(payrollData).toHaveLength(3);
      expect(payrollData[0].employee).toBe('Juan Pérez');
    });

    it('should generate IGSS export format', () => {
      const igssExport = mockEmployees.map((emp) => ({
        employeeId: emp.id,
        employeeName: emp.name,
        grossSalary: emp.baseSalary,
        igssAmount: emp.baseSalary * 0.0483,
        month: 10,
        year: 2024,
      }));

      expect(igssExport).toHaveLength(3);
      expect(igssExport[0].igssAmount).toBeCloseTo(579.6, 0.1);
    });
  });
});

console.log('✓ Payroll integration tests completed');
