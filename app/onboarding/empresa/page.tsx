/**
 * ORIGEN ERP - Onboarding de Empresa Inicial
 *
 * Página mostrada después del registro cuando el usuario aún no tiene
 * una empresa asociada. Permite crear la empresa inicial para poder
 * acceder al ERP.
 */

'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { useCompanyOnboarding } from '@/lib/hooks/useCompanyOnboarding';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import Link from 'next/link';

interface OnboardingFormData {
  commercialName: string;
  legalName: string;
  nit: string;
  address: string;
  phone: string;
  email: string;
  architectName: string;
  architectColNumber: string;
  exchangeRate: string;
}

export default function OnboardingEmpresaPage() {
  const router = useRouter();
  const { createCompany, loading, hasCompany } = useCompanyOnboarding();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formData, setFormData] = useState<OnboardingFormData>({
    commercialName: '',
    legalName: '',
    nit: '',
    address: '',
    phone: '',
    email: '',
    architectName: '',
    architectColNumber: '',
    exchangeRate: '7.85',
  });

  // Si ya tiene empresa, redirigir al dashboard (fuera del render).
  useEffect(() => {
    if (hasCompany) {
      router.replace('/');
    }
  }, [hasCompany, router]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.commercialName.trim()) {
      newErrors.commercialName = 'El nombre comercial es requerido';
    }
    if (!formData.legalName.trim()) {
      newErrors.legalName = 'La razón social es requerida';
    }
    if (!formData.nit.trim()) {
      newErrors.nit = 'El NIT es requerido';
    }
    if (!formData.address.trim()) {
      newErrors.address = 'La dirección es requerida';
    }
    if (!formData.phone.trim()) {
      newErrors.phone = 'El teléfono es requerido';
    }
    if (!formData.email.trim()) {
      newErrors.email = 'El correo es requerido';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Correo electrónico inválido';
    }
    if (!formData.architectName.trim()) {
      newErrors.architectName = 'El nombre del arquitecto es requerido';
    }
    if (!formData.architectColNumber.trim()) {
      newErrors.architectColNumber = 'El número de colegiado es requerido';
    }
    if (!formData.exchangeRate.trim() || isNaN(Number(formData.exchangeRate))) {
      newErrors.exchangeRate = 'Tipo de cambio inválido';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      toast.error('Por favor completa todos los campos correctamente');
      return;
    }

    try {
      const success = await createCompany({
        companyName: formData.commercialName.trim(),
        commercialName: formData.commercialName.trim(),
        legalName: formData.legalName.trim(),
        nit: formData.nit.trim(),
        address: formData.address.trim(),
        phone: formData.phone.trim(),
        email: formData.email.trim(),
        architectName: formData.architectName.trim(),
        architectColNumber: formData.architectColNumber.trim(),
        exchangeRate: Number(formData.exchangeRate),
        primaryColor: '#f59e0b',
        secondaryColor: '#0f172a',
      });

      if (success) {
        setTimeout(() => {
          router.replace('/');
        }, 1000);
      }
    } catch (error) {
      toast.error('Error al crear la empresa');
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 p-4">
      <div className="w-full max-w-2xl">
        <Card variant="glass" padding="lg" className="mx-auto w-full shadow-glass-xl">
          <div className="mb-8 text-center">
            <div className="mb-4 flex items-center justify-center gap-2">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-amber-400 via-amber-500 to-sky-500 flex items-center justify-center shadow-glass">
                <span className="text-white font-bold">O</span>
              </div>
              <div>
                <h1 className="mb-0 text-2xl font-bold text-white">ORIGEN ERP</h1>
                <p className="text-sm text-slate-400">Configuración inicial de empresa</p>
              </div>
            </div>
          </div>

          {errors.general && (
            <div className="mb-6 flex gap-3 rounded-lg border border-amber-500/30 bg-amber-500/10 p-4">
              <p className="text-xs text-amber-600">{errors.general}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Nombre Comercial
                </label>
                <Input
                  type="text"
                  placeholder="Ej. Construcciones García S.A."
                  value={formData.commercialName}
                  onChange={(e) => setFormData({ ...formData, commercialName: e.target.value })}
                  disabled={loading}
                  required
                  variant={errors.commercialName ? 'error' : 'default'}
                />
                {errors.commercialName && (
                  <p className="mt-1 text-xs text-red-400">{errors.commercialName}</p>
                )}
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Razón Social
                </label>
                <Input
                  type="text"
                  placeholder="Ej. Construcciones García, S.A."
                  value={formData.legalName}
                  onChange={(e) => setFormData({ ...formData, legalName: e.target.value })}
                  disabled={loading}
                  required
                  variant={errors.legalName ? 'error' : 'default'}
                />
                {errors.legalName && (
                  <p className="mt-1 text-xs text-red-400">{errors.legalName}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  NIT
                </label>
                <Input
                  type="text"
                  placeholder="Ej. 1234567-8"
                  value={formData.nit}
                  onChange={(e) => setFormData({ ...formData, nit: e.target.value })}
                  disabled={loading}
                  required
                  variant={errors.nit ? 'error' : 'default'}
                />
                {errors.nit && <p className="mt-1 text-xs text-red-400">{errors.nit}</p>}
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Teléfono
                </label>
                <Input
                  type="tel"
                  placeholder="+502 1234-5678"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  disabled={loading}
                  required
                  variant={errors.phone ? 'error' : 'default'}
                />
                {errors.phone && <p className="mt-1 text-xs text-red-400">{errors.phone}</p>}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Dirección
                </label>
                <Input
                  type="text"
                  placeholder="Ej. 12 Avenida 12-34, Zona 10, Ciudad de Guatemala"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  disabled={loading}
                  required
                  variant={errors.address ? 'error' : 'default'}
                />
                {errors.address && (
                  <p className="mt-1 text-xs text-red-400">{errors.address}</p>
                )}
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Correo Electrónico
                </label>
                <Input
                  type="email"
                  placeholder="empresa@correo.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  disabled={loading}
                  required
                  variant={errors.email ? 'error' : 'default'}
                />
                {errors.email && <p className="mt-1 text-xs text-red-400">{errors.email}</p>}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Arquitecto Responsable
                </label>
                <Input
                  type="text"
                  placeholder="Ej. Juan Pérez"
                  value={formData.architectName}
                  onChange={(e) => setFormData({ ...formData, architectName: e.target.value })}
                  disabled={loading}
                  required
                  variant={errors.architectName ? 'error' : 'default'}
                />
                {errors.architectName && (
                  <p className="mt-1 text-xs text-red-400">{errors.architectName}</p>
                )}
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  No. Colegiado
                </label>
                <Input
                  type="text"
                  placeholder="Ej. 12345"
                  value={formData.architectColNumber}
                  onChange={(e) => setFormData({ ...formData, architectColNumber: e.target.value })}
                  disabled={loading}
                  required
                  variant={errors.architectColNumber ? 'error' : 'default'}
                />
                {errors.architectColNumber && (
                  <p className="mt-1 text-xs text-red-400">{errors.architectColNumber}</p>
                )}
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Tipo de Cambio (GTQ por USD)
              </label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  step="0.01"
                  placeholder="7.85"
                  value={formData.exchangeRate}
                  onChange={(e) => setFormData({ ...formData, exchangeRate: e.target.value })}
                  disabled={loading}
                  required
                  variant={errors.exchangeRate ? 'error' : 'default'}
                />
                <span className="text-xs text-slate-500">GTQ por 1 USD</span>
              </div>
              {errors.exchangeRate && (
                <p className="mt-1 text-xs text-red-400">{errors.exchangeRate}</p>
              )}
            </div>

            <div className="pt-6">
              <Button
                type="submit"
                variant="primary"
                size="lg"
                isLoading={loading}
                disabled={loading}
                className="w-full"
              >
                {loading ? 'Creando empresa…' : 'Crear Empresa y Continuar'}
              </Button>
            </div>
          </form>

          <div className="mt-8 border-t border-white/10 pt-8 text-center">
            <p className="text-sm text-slate-400">
              ¿Ya tienes cuenta?{' '}
              <Link href="/login" className="font-medium text-amber-400 hover:text-amber-300">
                Inicia sesión
              </Link>
            </p>
          </div>
        </Card>
      </div>

      <p className="mt-8 text-center text-xs text-slate-500">
        © 2024 ORIGEN ERP. Todos los derechos reservados.
      </p>
    </div>
  );
}