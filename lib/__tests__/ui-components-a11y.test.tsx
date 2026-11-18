import React, { createElement as h } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';

afterEach(cleanup);

function describedByText(element: HTMLElement): string | null {
  const id = element.getAttribute('aria-describedby');
  return id ? (document.getElementById(id)?.textContent ?? null) : null;
}

describe('Input accesibilidad', () => {
  it('asocia la etiqueta con el campo', () => {
    render(h(Input, { label: 'Correo' }));
    const input = screen.getByLabelText('Correo');
    expect(input.tagName).toBe('INPUT');
    expect(input.getAttribute('aria-invalid')).toBeNull();
    expect(input.getAttribute('aria-describedby')).toBeNull();
  });

  it('marca el error y lo describe con aria-invalid/aria-describedby', () => {
    render(h(Input, { label: 'Correo', errorText: 'Requerido' }));
    const input = screen.getByLabelText('Correo');
    expect(input.getAttribute('aria-invalid')).toBe('true');
    expect(describedByText(input)).toBe('Requerido');
  });

  it('usa helperText como descripción cuando no hay error', () => {
    render(h(Input, { label: 'Correo', helperText: 'Usa tu correo corporativo' }));
    const input = screen.getByLabelText('Correo');
    expect(input.getAttribute('aria-invalid')).toBeNull();
    expect(describedByText(input)).toBe('Usa tu correo corporativo');
  });

  it('mantiene el id y aria-describedby provistos por el consumidor', () => {
    render(
      h(
        React.Fragment,
        null,
        h('p', { id: 'ayuda-externa' }, 'Ayuda externa'),
        h(Input, {
          id: 'correo-empresa',
          'aria-describedby': 'ayuda-externa',
          label: 'Correo',
        })
      )
    );
    const input = screen.getByLabelText('Correo');
    expect(input.id).toBe('correo-empresa');
    expect(describedByText(input)).toBe('Ayuda externa');
  });
});

describe('Button type por defecto', () => {
  it('no envía formularios de forma implícita', () => {
    render(h(Button, null, 'Acción'));
    expect(screen.getByRole('button', { name: 'Acción' }).getAttribute('type')).toBe('button');
  });

  it('permite declarar type="submit" explícitamente', () => {
    render(h(Button, { type: 'submit' }, 'Enviar'));
    expect(screen.getByRole('button', { name: 'Enviar' }).getAttribute('type')).toBe('submit');
  });
});

describe('Modal y tecla Escape', () => {
  it('cierra una sola vez al presionar Escape', () => {
    const onClose = vi.fn();
    render(
      h(Modal, {
        isOpen: true,
        onClose,
        title: 'Prueba',
        children: h('p', null, 'contenido'),
      })
    );

    fireEvent.keyDown(document, { key: 'Escape' });

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('respeta closeOnEscape={false}', () => {
    const onClose = vi.fn();
    render(
      h(Modal, {
        isOpen: true,
        onClose,
        closeOnEscape: false,
        title: 'Prueba',
        children: h('p', null, 'contenido'),
      })
    );

    fireEvent.keyDown(document, { key: 'Escape' });

    expect(onClose).not.toHaveBeenCalled();
  });
});
