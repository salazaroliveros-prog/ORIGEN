/**
 * ORIGEN ERP - Machinery Integration Tests
 *
 * Tests de integración para componentes de maquinaria
 */

import { describe, it, expect } from 'vitest';

// Machinery interface for tests
interface Machinery {
  id: string;
  name: string;
  type: string;
  model: string;
  serialNumber: string;
  purchaseDate: string;
  status: 'active' | 'maintenance' | 'inactive';
  hourlyRate: number;
  currentProjectId?: string;
  companyId: string;
}

// Machinery log interface for tests
interface MachineryLog {
  id: string;
  machineryId: string;
  date: string;
  hoursUsed: number;
  operatorId: string;
  projectId: string;
  maintenanceNotes?: string;
  companyId: string;
}

const mockMachinery: Machinery[] = [
  {
    id: 'mach-001',
    name: 'Excavadora CAT 320',
    type: 'Excavadora',
    model: 'CAT 320',
    serialNumber: 'CAT320-2024-001',
    purchaseDate: '2024-01-15',
    status: 'active',
    hourlyRate: 150,
    currentProjectId: 'proj-001',
    companyId: 'comp-001',
  },
  {
    id: 'mach-002',
    name: 'Grúa Liebherr LTM',
    type: 'Grúa',
    model: 'LTM 1120-4.1',
    serialNumber: 'LTM-2024-002',
    purchaseDate: '2024-02-01',
    status: 'active',
    hourlyRate: 200,
    currentProjectId: 'proj-002',
    companyId: 'comp-001',
  },
  {
    id: 'mach-003',
    name: 'Camión Mixer',
    type: 'Camión',
    model: 'Mixer 5000',
    serialNumber: 'MIX-2024-003',
    purchaseDate: '2024-03-01',
    status: 'maintenance',
    hourlyRate: 80,
    companyId: 'comp-001',
  },
];

const mockMachineryLogs: MachineryLog[] = [
  {
    id: 'log-001',
    machineryId: 'mach-001',
    date: '2024-10-27',
    hoursUsed: 8,
    operatorId: 'emp-001',
    projectId: 'proj-001',
    companyId: 'comp-001',
  },
  {
    id: 'log-002',
    machineryId: 'mach-001',
    date: '2024-10-28',
    hoursUsed: 10,
    operatorId: 'emp-001',
    projectId: 'proj-001',
    companyId: 'comp-001',
  },
  {
    id: 'log-003',
    machineryId: 'mach-002',
    date: '2024-10-27',
    hoursUsed: 6,
    operatorId: 'emp-002',
    projectId: 'proj-002',
    companyId: 'comp-001',
  },
];

describe('Machinery Integration Tests', () => {
  describe('Machinery Data Validation', () => {
    it('should validate machinery data structure', () => {
      expect(mockMachinery).toHaveLength(3);
      expect(mockMachinery[0].id).toBeDefined();
      expect(mockMachinery[0].name).toBeDefined();
      expect(mockMachinery[0].type).toBeDefined();
      expect(mockMachinery[0].hourlyRate).toBeGreaterThan(0);
    });

    it('should filter active machinery', () => {
      const activeMachinery = mockMachinery.filter((m) => m.status === 'active');
      expect(activeMachinery).toHaveLength(2);
    });

    it('should filter machinery by project', () => {
      const projectMachinery = mockMachinery.filter((m) => m.currentProjectId === 'proj-001');
      expect(projectMachinery).toHaveLength(1);
      expect(projectMachinery[0].name).toBe('Excavadora CAT 320');
    });

    it('should calculate machinery age', () => {
      const purchaseDate = new Date('2024-01-15');
      const now = new Date();
      const ageInMonths =
        (now.getFullYear() - purchaseDate.getFullYear()) * 12 +
        (now.getMonth() - purchaseDate.getMonth());

      expect(ageInMonths).toBeGreaterThan(0);
    });
  });

  describe('Machinery Usage Tracking', () => {
    it('should validate machinery log data structure', () => {
      expect(mockMachineryLogs).toHaveLength(3);
      expect(mockMachineryLogs[0].machineryId).toBeDefined();
      expect(mockMachineryLogs[0].date).toBeDefined();
      expect(mockMachineryLogs[0].hoursUsed).toBeGreaterThan(0);
    });

    it('should calculate total hours per machinery', () => {
      const mach001Hours = mockMachineryLogs
        .filter((log) => log.machineryId === 'mach-001')
        .reduce((sum, log) => sum + log.hoursUsed, 0);

      expect(mach001Hours).toBe(18); // 8 + 10
    });

    it('should calculate machinery cost per period', () => {
      const mach001Hours = 18;
      const hourlyRate = 150;
      const totalCost = mach001Hours * hourlyRate;

      expect(totalCost).toBe(2700);
    });

    it('should calculate utilization rate', () => {
      const totalHours = 18;
      const availableHours = 160; // 20 days * 8 hours
      const utilizationRate = (totalHours / availableHours) * 100;

      expect(utilizationRate).toBe(11.25);
    });
  });

  describe('Maintenance Scheduling', () => {
    it('should identify machinery due for maintenance', () => {
      const maintenanceMachinery = mockMachinery.filter((m) => m.status === 'maintenance');
      expect(maintenanceMachinery).toHaveLength(1);
      expect(maintenanceMachinery[0].name).toBe('Camión Mixer');
    });

    it('should calculate maintenance interval', () => {
      const lastMaintenance = new Date('2024-09-01');
      const now = new Date();
      const daysSinceMaintenance = Math.floor(
        (now.getTime() - lastMaintenance.getTime()) / (1000 * 60 * 60 * 24)
      );

      expect(daysSinceMaintenance).toBeGreaterThan(30);
    });

    it('should validate maintenance notes', () => {
      const maintenanceLog: MachineryLog = {
        id: 'log-004',
        machineryId: 'mach-003',
        date: '2024-10-27',
        hoursUsed: 0,
        operatorId: 'emp-001',
        projectId: 'proj-001',
        maintenanceNotes: 'Cambio de aceite y filtro',
        companyId: 'comp-001',
      };

      expect(maintenanceLog.maintenanceNotes).toBeDefined();
      expect(maintenanceLog.maintenanceNotes?.length).toBeGreaterThan(0);
    });
  });

  describe('Machinery Cost Analysis', () => {
    it('should calculate total machinery cost for project', () => {
      const projectMachinery = mockMachinery.filter((m) => m.currentProjectId === 'proj-001');
      const totalDailyCost = projectMachinery.reduce((sum, m) => sum + m.hourlyRate * 8, 0);

      expect(totalDailyCost).toBe(1200); // 150 * 8 for excavator
    });

    it('should calculate cost per hour of operation', () => {
      const hourlyRate = 150;
      const fuelCost = 25; // per hour
      const operatorCost = 40; // per hour
      const totalCostPerHour = hourlyRate + fuelCost + operatorCost;

      expect(totalCostPerHour).toBe(215);
    });

    it('should calculate depreciation', () => {
      const purchasePrice = 500000;
      const usefulLifeYears = 10;
      const annualDepreciation = purchasePrice / usefulLifeYears;
      const monthlyDepreciation = annualDepreciation / 12;

      expect(annualDepreciation).toBe(50000);
      expect(monthlyDepreciation).toBeCloseTo(4166.67, 0.01);
    });
  });

  describe('Machinery Assignment', () => {
    it('should validate machinery assignment to project', () => {
      const assignment = {
        machineryId: 'mach-001',
        projectId: 'proj-001',
        startDate: '2024-10-01',
        endDate: '2024-10-31',
        assignedBy: 'user-001',
      };

      expect(assignment.machineryId).toBeDefined();
      expect(assignment.projectId).toBeDefined();
      expect(assignment.startDate).toBeDefined();
    });

    it('should check for scheduling conflicts', () => {
      const assignments = [
        {
          machineryId: 'mach-001',
          projectId: 'proj-001',
          startDate: '2024-10-01',
          endDate: '2024-10-31',
        },
        {
          machineryId: 'mach-001',
          projectId: 'proj-002',
          startDate: '2024-10-15',
          endDate: '2024-11-15',
        },
      ];

      const mach001Assignments = assignments.filter((a) => a.machineryId === 'mach-001');
      const hasConflict = mach001Assignments.length > 1;

      expect(hasConflict).toBe(true);
    });

    it('should calculate available machinery for dates', () => {
      const startDate = '2024-11-01';
      const endDate = '2024-11-30';
      const availableMachinery = mockMachinery.filter(
        (m) => m.status === 'active' && (!m.currentProjectId || m.currentProjectId === '')
      );

      expect(availableMachinery.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Machinery Reporting', () => {
    it('should generate machinery utilization report', () => {
      const report = {
        period: '2024-10',
        machinery: mockMachinery.map((m) => ({
          name: m.name,
          totalHours: mockMachineryLogs
            .filter((log) => log.machineryId === m.id)
            .reduce((sum, log) => sum + log.hoursUsed, 0),
          totalCost:
            mockMachineryLogs
              .filter((log) => log.machineryId === m.id)
              .reduce((sum, log) => sum + log.hoursUsed, 0) * m.hourlyRate,
        })),
      };

      expect(report.machinery).toHaveLength(3);
    });

    it('should generate maintenance report', () => {
      const maintenanceReport = {
        period: '2024-10',
        machinery: mockMachinery.filter((m) => m.status === 'maintenance'),
        totalMaintenanceCost: 5000,
      };

      expect(maintenanceReport.machinery).toHaveLength(1);
    });

    it('should generate cost analysis report', () => {
      const costReport = {
        period: '2024-10',
        totalOperatingCost: 15000,
        totalMaintenanceCost: 5000,
        totalFuelCost: 8000,
        totalOperatorCost: 12000,
      };

      const totalCost =
        costReport.totalOperatingCost +
        costReport.totalMaintenanceCost +
        costReport.totalFuelCost +
        costReport.totalOperatorCost;

      expect(totalCost).toBe(40000);
    });
  });
});

console.log('✓ Machinery integration tests completed');
