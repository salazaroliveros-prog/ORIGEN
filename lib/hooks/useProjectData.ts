import { useEffect, useState } from 'react';
import type { Project, FieldVisit, ExpenseRecord, AttendanceRecord, CompanySettings } from '@/lib/types';
import {
  subscribeProjects,
  subscribeFieldVisits,
  subscribeExpenses,
  subscribeAttendance,
  subscribeCompanySettings,
} from '@/lib/firebaseService';

export function useProjectData(currentUserId?: string) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [fieldVisits, setFieldVisits] = useState<FieldVisit[]>([]);
  const [expenses, setExpenses] = useState<ExpenseRecord[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [company, setCompany] = useState<CompanySettings | null>(null);

  useEffect(() => {
    if (!currentUserId) return;

    const unsubProjects = subscribeProjects(currentUserId, setProjects);
    const unsubFieldVisits = subscribeFieldVisits(currentUserId, setFieldVisits);
    const unsubExpenses = subscribeExpenses(currentUserId, setExpenses);
    const unsubAttendance = subscribeAttendance(currentUserId, setAttendance);
    const unsubCompany = subscribeCompanySettings(currentUserId, setCompany);

    return () => {
      unsubProjects();
      unsubFieldVisits();
      unsubExpenses();
      unsubAttendance();
      unsubCompany();
    };
  }, [currentUserId]);

  return { projects, fieldVisits, expenses, attendance, company };
}
