'use client';

import React from 'react';
import { StaffAndAttendance } from '@/components/StaffAndAttendance';
import type { AttendanceRecord, CompanySettings, Employee, Project } from '@/lib/types';
import { initialEmployees } from '@/lib/data';

interface StaffViewProps {
  attendance: AttendanceRecord[];
  company?: CompanySettings;
  employees?: Employee[];
  projects?: Project[];
  activeProjectId?: string;
  onAddEmployee?: (emp: Employee) => Promise<boolean>;
  onAddAttendance?: (record: AttendanceRecord) => Promise<boolean>;
  onDeleteAttendance?: (id: string) => void;
}

export function StaffView({
  attendance = [],
  company,
  employees = initialEmployees,
  projects = [],
  activeProjectId = '',
  onAddEmployee = async () => false,
  onAddAttendance,
  onDeleteAttendance = () => {},
}: StaffViewProps) {
  return (
    <div className="responsive-container safe-area-top safe-area-bottom min-h-full space-y-6">
      <StaffAndAttendance
        employees={employees}
        attendance={attendance}
        projects={projects}
        activeProjectId={activeProjectId}
        onAddEmployee={onAddEmployee}
        onAddAttendance={onAddAttendance}
        onDeleteAttendance={onDeleteAttendance}
      />
    </div>
  );
}
