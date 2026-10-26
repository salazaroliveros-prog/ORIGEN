'use client';

import React from 'react';
import { StaffAndAttendance } from '@/components/StaffAndAttendance';
import type {
  AttendanceRecord,
  CompanySettings,
  Employee,
  EmployeeDirectoryEntry,
  Project,
} from '@/lib/types';

interface StaffViewProps {
  attendance: AttendanceRecord[];
  company?: CompanySettings;
  employees?: Array<Employee | EmployeeDirectoryEntry>;
  projects?: Project[];
  activeProjectId?: string;
  onAddEmployee?: (emp: Employee) => Promise<boolean>;
  onAddAttendance?: (record: AttendanceRecord) => Promise<boolean>;
  onDeleteAttendance?: (id: string) => Promise<boolean>;
  canViewEmployeeDetails: boolean;
}

export function StaffView({
  attendance = [],
  company,
  employees = [],
  projects = [],
  activeProjectId = '',
  onAddEmployee,
  onAddAttendance,
  onDeleteAttendance,
  canViewEmployeeDetails,
}: StaffViewProps) {
  return (
    <div className="responsive-container safe-area-top safe-area-bottom min-h-full space-y-6">
      <StaffAndAttendance
        employees={employees}
        attendance={attendance}
        company={company}
        projects={projects}
        activeProjectId={activeProjectId}
        onAddEmployee={onAddEmployee}
        onAddAttendance={onAddAttendance}
        onDeleteAttendance={onDeleteAttendance}
        canViewEmployeeDetails={canViewEmployeeDetails}
      />
    </div>
  );
}
