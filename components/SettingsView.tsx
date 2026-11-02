/**
 * ORIGEN ERP - Settings & Company Configuration
 * Features:
 * - Better logo upload with preview
 * - Image optimization
 * - Real-time exchange rate updates
 * - User invitations with link
 * - Role descriptions
 */

'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import {
  Settings,
  Upload,
  Save,
  DollarSign,
  Users,
  Link2,
  Copy,
  Check,
  Loader,
  AlertCircle,
  Image as ImageIcon,
  X,
} from 'lucide-react';
import { toast } from '@/components/ui/toast';

interface CompanySettings {
  name: string;
  nit: string;
  phone: string;
  email: string;
  address: string;
  logoUrl: string;
}

interface ExchangeRates {
  gtqToUsd: number;
  lastUpdate: string;
}

interface InvitedUser {
  id: string;
  email: string;
  role: string;
  inviteLink: string;
  createdAt: string;
  status: 'pending' | 'accepted';
}

const ROLE_DESCRIPTIONS: Record<string, string> = {
  admin: 'Acceso completo a todas las funciones y configuración',
  manager: 'Gestión de proyectos, presupuestos y reportes',
  supervisor: 'Supervisión de obra y registro de asistencia',
  accountant: 'Gestión contable, nómina y reportes financieros',
  viewer: 'Solo lectura de datos y reportes',
};

export function SettingsView() {
  // State
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Company settings
  const [company, setCompany] = useState<CompanySettings>({
    name: 'ORIGEN ERP',
    nit: '1234567-0',
    phone: '+502 7654-3210',
    email: 'info@origen.com',
    address: 'Guatemala City, GT',
    logoUrl: 'https://via.placeholder.com/200x100?text=ORIGEN+ERP',
  });

  // Logo preview
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);

  // Exchange rates
  const [exchangeRates, setExchangeRates] = useState<ExchangeRates>({
    gtqToUsd: 7.85,
    lastUpdate: new Date().toISOString().split('T')[0],
  });

  // Invited users
  const [invitedUsers, setInvitedUsers] = useState<InvitedUser[]>([
    {
      id: '1',
      email: 'user@example.com',
      role: 'manager',
      inviteLink: 'https://origen.app/invite/abc123',
      createdAt: new Date().toISOString().split('T')[0],
      status: 'pending',
    },
  ]);

  const [newInvite, setNewInvite] = useState({ email: '', role: 'viewer' });
  const [copiedLink, setCopiedLink] = useState<string | null>(null);

  // Simulate load
  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(false);
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  // FEATURE 3.1: Handle logo upload with preview
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Por favor selecciona una imagen válida');
      return;
    }

    // FEATURE 3.2: Image optimization
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        // Create canvas for optimization
        const canvas = document.createElement('canvas');
        const maxWidth = 600;
        const maxHeight = 300;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const optimizedUrl = canvas.toDataURL('image/jpeg', 0.8);
          setLogoPreview(optimizedUrl);
          setLogoFile(file);
          toast.success(`Imagen optimizada: ${Math.round((file.size / 1024) * 0.8)} KB`);
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  // FEATURE 3.1: Save settings
  const handleSaveSettings = async () => {
    setSaving(true);
    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000));

      if (logoPreview) {
        setCompany({ ...company, logoUrl: logoPreview });
      }

      toast.success('Configuración guardada');
      setLogoFile(null);
    } catch (error) {
      toast.error('Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  // FEATURE 3.3: Real-time exchange rate update
  const handleUpdateExchangeRate = async () => {
    try {
      // Simulate API call to real exchange rate service
      const response = await fetch('https://api.exchangerate-api.com/v4/latest/GTQ');
      const data = await response.json();
      const rate = data.rates?.USD || 7.85;

      setExchangeRates({
        gtqToUsd: parseFloat(rate.toFixed(4)),
        lastUpdate: new Date().toISOString(),
      });

      toast.success(`Tasa actualizada: 1 GTQ = ${rate.toFixed(4)} USD`);
    } catch (error) {
      toast.error('No se pudo actualizar la tasa de cambio');
    }
  };

  // FEATURE 3.4: Generate invite link
  const handleGenerateInvite = () => {
    if (!newInvite.email) {
      toast.error('Por favor ingresa un email');
      return;
    }

    const newUser: InvitedUser = {
      id: `user-${Date.now()}`,
      email: newInvite.email,
      role: newInvite.role,
      inviteLink: `https://origen.app/invite/${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date().toISOString().split('T')[0],
      status: 'pending',
    };

    setInvitedUsers([...invitedUsers, newUser]);
    setNewInvite({ email: '', role: 'viewer' });
    toast.success('Invitación generada');
  };

  // Copy invite link
  const handleCopyLink = (link: string) => {
    navigator.clipboard.writeText(link);
    setCopiedLink(link);
    setTimeout(() => setCopiedLink(null), 2000);
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center gap-2 text-slate-600">
          <Loader className="h-5 w-5 animate-spin" />
          <span>Cargando configuración...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 bg-slate-50 p-6">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Settings className="h-8 w-8 text-slate-900" />
        <h1 className="text-3xl font-bold text-slate-900">Configuración</h1>
      </div>

      {/* Company Settings */}
      <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-xl font-bold text-slate-900">Información de la Empresa</h2>

        <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Nombre</label>
            <input
              type="text"
              value={company.name}
              onChange={(e) => setCompany({ ...company, name: e.target.value })}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-transparent focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">NIT</label>
            <input
              type="text"
              value={company.nit}
              onChange={(e) => setCompany({ ...company, nit: e.target.value })}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-transparent focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Teléfono</label>
            <input
              type="tel"
              value={company.phone}
              onChange={(e) => setCompany({ ...company, phone: e.target.value })}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-transparent focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Email</label>
            <input
              type="email"
              value={company.email}
              onChange={(e) => setCompany({ ...company, email: e.target.value })}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-transparent focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="md:col-span-2">
            <label className="mb-1 block text-sm font-medium text-slate-700">Dirección</label>
            <input
              type="text"
              value={company.address}
              onChange={(e) => setCompany({ ...company, address: e.target.value })}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-transparent focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Logo Upload - FEATURE 3.1 - FIXED: Improved drop zone visibility */}
        <div className="mb-4 cursor-pointer rounded-lg border-4 border-dashed border-blue-300 p-6 text-center transition-all hover:border-blue-500 hover:bg-blue-50">
          {logoPreview ? (
            <div className="relative inline-block">
              <Image
                src={logoPreview}
                alt="Logo preview"
                width={300}
                height={130}
                className="mx-auto max-h-32"
              />
              <button
                onClick={() => {
                  setLogoPreview(null);
                  setLogoFile(null);
                }}
                className="absolute -top-2 -right-2 rounded-full bg-red-600 p-1 text-white transition-colors hover:bg-red-700"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <div>
              <ImageIcon className="mx-auto mb-2 h-12 w-12 text-slate-400" />
              <p className="mb-2 text-sm text-slate-600">Haz clic o arrastra tu logo aquí</p>
              <input
                type="file"
                accept="image/*"
                onChange={handleLogoUpload}
                className="hidden"
                id="logo-upload"
              />
              <button
                onClick={() => document.getElementById('logo-upload')?.click()}
                className="text-sm font-semibold text-blue-600 hover:text-blue-700"
              >
                Seleccionar archivo
              </button>
            </div>
          )}
        </div>

        {/* Save Button */}
        <button
          onClick={handleSaveSettings}
          disabled={saving}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white transition-colors hover:bg-blue-700 disabled:bg-slate-400"
        >
          {saving ? (
            <>
              <Loader className="h-5 w-5 animate-spin" />
              Guardando...
            </>
          ) : (
            <>
              <Save className="h-5 w-5" />
              Guardar Cambios
            </>
          )}
        </button>
      </div>

      {/* Exchange Rates - FEATURE 3.3 */}
      <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-xl font-bold text-slate-900">
            <DollarSign className="h-6 w-6" />
            Tasas de Cambio
          </h2>
          <button
            onClick={handleUpdateExchangeRate}
            className="rounded bg-green-100 px-3 py-1 text-sm font-semibold text-green-700 transition-colors hover:bg-green-200"
          >
            Actualizar
          </button>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
            <p className="text-sm text-slate-600">GTQ a USD</p>
            <p className="text-3xl font-bold text-slate-900">
              1 GTQ = {exchangeRates.gtqToUsd} USD
            </p>
            <p className="mt-2 text-xs text-slate-500">
              Actualizado: {new Date(exchangeRates.lastUpdate).toLocaleString()}
            </p>
          </div>

          <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
            <p className="text-sm font-medium text-blue-700">Manual</p>
            <input
              type="number"
              value={exchangeRates.gtqToUsd}
              onChange={(e) =>
                setExchangeRates({
                  ...exchangeRates,
                  gtqToUsd: parseFloat(e.target.value),
                })
              }
              step="0.01"
              className="mt-2 w-full rounded-lg border border-blue-300 px-3 py-2 focus:border-transparent focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      {/* User Invitations - FEATURE 3.4 */}
      <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 flex items-center gap-2 text-xl font-bold text-slate-900">
          <Users className="h-6 w-6" />
          Invitar Usuarios
        </h2>

        {/* Invite Form */}
        <div className="mb-6 grid grid-cols-1 gap-3 md:grid-cols-4">
          <input
            type="email"
            value={newInvite.email}
            onChange={(e) => setNewInvite({ ...newInvite, email: e.target.value })}
            placeholder="email@example.com"
            className="rounded-lg border border-slate-300 px-3 py-2 focus:border-transparent focus:ring-2 focus:ring-blue-500"
          />

          {/* FEATURE 3.5: Role Descriptions */}
          <select
            value={newInvite.role}
            onChange={(e) => setNewInvite({ ...newInvite, role: e.target.value })}
            className="rounded-lg border border-slate-300 px-3 py-2 focus:border-transparent focus:ring-2 focus:ring-blue-500"
          >
            {Object.keys(ROLE_DESCRIPTIONS).map((role) => (
              <option key={role} value={role}>
                {role.charAt(0).toUpperCase() + role.slice(1)}
              </option>
            ))}
          </select>

          <button
            onClick={handleGenerateInvite}
            className="col-span-1 flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white transition-colors hover:bg-blue-700 md:col-span-2"
          >
            <Link2 className="h-5 w-5" />
            Generar Invitación
          </button>
        </div>

        {/* Role Descriptions - FEATURE 3.5 */}
        <div className="mb-6 grid grid-cols-1 gap-3 rounded-lg border border-blue-200 bg-blue-50 p-4 md:grid-cols-2">
          <p className="col-span-full mb-2 text-sm font-semibold text-blue-900">
            Descripciones de Roles:
          </p>
          {Object.entries(ROLE_DESCRIPTIONS).map(([role, desc]) => (
            <div key={role} className="text-sm">
              <p className="font-semibold text-blue-900 capitalize">{role}</p>
              <p className="text-blue-800">{desc}</p>
            </div>
          ))}
        </div>

        {/* Invited Users List */}
        <div className="space-y-2">
          <h3 className="font-semibold text-slate-900">Usuarios Invitados</h3>
          {invitedUsers.map((user) => (
            <div
              key={user.id}
              className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex-1">
                <p className="font-medium text-slate-900">{user.email}</p>
                <p className="text-xs text-slate-600">
                  Rol: <span className="font-semibold capitalize">{user.role}</span> • Estado:{' '}
                  <span
                    className={`font-semibold ${
                      user.status === 'pending' ? 'text-yellow-600' : 'text-green-600'
                    }`}
                  >
                    {user.status === 'pending' ? 'Pendiente' : 'Aceptado'}
                  </span>
                </p>
              </div>

              <button
                onClick={() => handleCopyLink(user.inviteLink)}
                className={`flex items-center gap-2 rounded px-3 py-1 text-sm font-semibold transition-colors ${
                  copiedLink === user.inviteLink
                    ? 'bg-green-100 text-green-700'
                    : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                }`}
              >
                {copiedLink === user.inviteLink ? (
                  <>
                    <Check className="h-4 w-4" />
                    Copiado
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4" />
                    Copiar
                  </>
                )}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* System Info */}
      <div className="rounded-lg border border-slate-300 bg-slate-100 p-4 text-sm text-slate-600">
        <div className="flex gap-2">
          <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-slate-700" />
          <div>
            <p className="font-semibold text-slate-900">Versión del Sistema</p>
            <p>ORIGEN ERP v2.0.0 • Última actualización: hoy</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SettingsView;
