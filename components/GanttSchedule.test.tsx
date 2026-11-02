import React from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { GanttSchedule } from './GanttSchedule';

const mockProjects = [{ id: 'proj-1', name: 'Test Project', code: 'TP', endDate: '2026-12-31' }];
const mockTasks = [
  {
    id: 'task-1',
    name: 'Test Task',
    phase: 'Preliminares',
    progress: 0,
    startDate: '2026-01-01',
    endDate: '2026-01-31',
    completed: false,
    weightPercent: 10,
    assignedTo: 'Test User',
    criticalPath: false,
    notes: 'Test note',
  },
];

describe('GanttSchedule Component', () => {
  describe('Milestone Form Accessibility', () => {
    test('renders milestone form with correct accessibility attributes', () => {
      render(<GanttSchedule tasks={[]} projects={mockProjects} activeProjectId="proj-1" />);

      // Switch to milestones view
      const milestonesTab = screen.getByRole('button', { name: /Hitos hacia el Objetivo/ });
      fireEvent.click(milestonesTab);

      // Open milestone modal
      const nuevoHitoButton = screen.getByRole('button', { name: 'Nuevo hito' });
      fireEvent.click(nuevoHitoButton);

      const form = screen.getByRole('dialog', { name: 'Crear hito del proyecto' });
      expect(form).toHaveAttribute('role', 'dialog');
      expect(form).toHaveAttribute('aria-modal', 'true');
      expect(form).toHaveAttribute('aria-labelledby', 'new-milestone-title');

      const h3 = screen.getByRole('heading', { name: 'Crear hito del proyecto' });
      expect(h3).toHaveAttribute('id', 'new-milestone-title');

      const submitButton = screen.getByRole('button', { name: 'Crear hito' });
      expect(submitButton).toBeInTheDocument();
    });

    test('has correct initial state for milestone form', () => {
      render(<GanttSchedule tasks={[]} projects={mockProjects} activeProjectId="proj-1" />);

      // Switch to milestones view
      const milestonesTab = screen.getByRole('button', { name: /Hitos hacia el Objetivo/ });
      fireEvent.click(milestonesTab);

      // Open milestone modal
      const nuevoHitoButton = screen.getByRole('button', { name: 'Nuevo hito' });
      fireEvent.click(nuevoHitoButton);

      const form = screen.getByRole('dialog', { name: 'Crear hito del proyecto' });

      const titleInput = screen.getByRole('textbox', { name: 'Nombre del hito' });
      expect(titleInput).toBeInTheDocument();

      const phaseSelect = screen.getByRole('combobox', { name: 'Fase' });
      expect(phaseSelect).toBeInTheDocument();
    });
  });

  describe('Reminder Form Accessibility', () => {
    test('renders reminder form with correct accessibility attributes', () => {
      render(<GanttSchedule tasks={mockTasks} projects={mockProjects} activeProjectId="proj-1" />);

      // Open reminder modal via button
      const reminderButton = screen.getByRole('button', { name: /Configurar Recordatorios/ });
      fireEvent.click(reminderButton);

      const form = screen.getByRole('dialog', { name: 'Programar recordatorio' });
      expect(form).toHaveAttribute('role', 'dialog');
      expect(form).toHaveAttribute('aria-modal', 'true');
      expect(form).toHaveAttribute('aria-labelledby', 'new-reminder-title');

      const h3 = screen.getByRole('heading', { name: 'Programar recordatorio' });
      expect(h3).toHaveAttribute('id', 'new-reminder-title');
    });

    test('reminder form has required fields accessible', () => {
      render(<GanttSchedule tasks={mockTasks} projects={mockProjects} activeProjectId="proj-1" />);

      const reminderButton = screen.getByRole('button', { name: /Configurar Recordatorios/ });
      fireEvent.click(reminderButton);

      const titleInput = screen.getByRole('textbox', { name: 'Título' });
      expect(titleInput).toBeInTheDocument();
    });
  });

  describe('New Task Modal Accessibility', () => {
    test('renders new task modal with correct accessibility attributes', () => {
      render(<GanttSchedule tasks={mockTasks} projects={mockProjects} activeProjectId="proj-1" />);

      // Open new task modal
      const newTaskButton = screen.getByRole('button', { name: /Nueva Actividad/ });
      fireEvent.click(newTaskButton);

      const modal = screen.getByRole('dialog', { name: /Agregar Nueva Tarea al Cronograma/ });
      expect(modal).toHaveAttribute('role', 'dialog');
      expect(modal).toHaveAttribute('aria-modal', 'true');
      expect(modal).toHaveAttribute('aria-labelledby', 'new-task-title');

      const h3 = screen.getByRole('heading', { name: /Agregar Nueva Tarea al Cronograma/ });
      expect(h3).toHaveAttribute('id', 'new-task-title');
    });

    test('new task form has required fields accessible', () => {
      render(<GanttSchedule tasks={mockTasks} projects={mockProjects} activeProjectId="proj-1" />);

      const newTaskButton = screen.getByRole('button', { name: /Nueva Actividad/ });
      fireEvent.click(newTaskButton);

      const nameInput = screen.getByRole('textbox', { name: /Nombre de la Actividad/ });
      expect(nameInput).toBeInTheDocument();

      const phaseSelect = screen.getByRole('combobox', { name: /Fase Constructiva/ });
      expect(phaseSelect).toBeInTheDocument();
    });
  });
});
