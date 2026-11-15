/**
 * ORIGEN ERP - Perfil de Usuario
 *
 * Página para editar los datos del usuario autenticado:
 * nombre, correo, teléfono, contraseña y foto de perfil.
 */

'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { useAuthSession } from '@/lib/hooks/useAuthSession';
import { updateProfileData, updateUserPassword } from '@/lib/firebaseAuth';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import Link from 'next/link';

interface ProfileFormData {
  displayName: string;
  phoneNumber: string;
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export default function ProfilePage() {
  const router = useRouter();
  const { currentUser, signOut } = useAuthSession();
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formData, setFormData] = useState<ProfileFormData>({
    displayName: currentUser?.displayName ?? '',
    phoneNumber: currentUser?.phoneNumber ?? '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.displayName.trim()) {
      newErrors.displayName = 'El nombre es requerido';
    }
    if (formData.newPassword && formData.newPassword !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Las contraseñas no coinciden';
    }
    if (formData.newPassword && formData.newPassword.length < 6) {
      newErrors.newPassword = 'La contraseña debe tener al menos 6 caracteres';
    }
    if (formData.confirmPassword && !formData.newPassword) {
      newErrors.newPassword = 'Ingrese una contraseña nueva';
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

    if (!currentUser) {
      toast.error('No hay sesión activa');
      return;
    }

    setLoading(true);
    try {
      // Actualizar nombre y teléfono
      await updateProfileData({
        displayName: formData.displayName.trim() || undefined,
        phoneNumber: formData.phoneNumber.trim() || undefined,
      });

      // Cambiar contraseña si se proporcionó
      if (formData.newPassword) {
        await updateUserPassword(formData.newPassword);
      }

      toast.success('Perfil actualizado correctamente.');
      setTimeout(() => {
        router.replace('/');
      }, 1500);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error al actualizar perfil';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  if (!currentUser) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950">
        <div className="text-center">
          <p className="text-slate-400">Cargando perfil…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-4">
      <Card variant="glass" padding="lg">
        <div className="mb-6 flex items-center gap-2">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-amber-400 via-amber-500 to-sky-500 flex items-center justify-center shadow-glass">
            <span className="text-white font-bold">👤</span>
          </div>
          <div>
            <h1 className="mb-0 text-2xl font-bold text-white">Perfil de Usuario</h1>
            <p className="text-sm text-slate-400">{currentUser.email}</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Nombre Completo
            </label>
            <Input
              type="text"
              placeholder="Tu nombre completo"
              value={formData.displayName}
              onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
              disabled={loading}
              required
              variant={errors.displayName ? 'error' : 'default'}
            />
            {errors.displayName && (
              <p className="mt-1 text-xs text-red-400">{errors.displayName}</p>
            )}
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Teléfono
            </label>
            <Input
              type="tel"
              placeholder="+502 1234-5678"
              value={formData.phoneNumber}
              onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
              disabled={loading}
              variant={errors.phoneNumber ? 'error' : 'default'}
            />
            {errors.phoneNumber && (
              <p className="mt-1 text-xs text-red-400">{errors.phoneNumber}</p>
            )}
          </div>

          <div className="pt-6 border-t border-white/10 pt-6">
            <h3 className="mb-4 text-sm font-semibold text-slate-400 uppercase tracking-wider">
              Cambiar Contraseña
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Contraseña Actual
                </label>
                <Input
                  type="password"
                  placeholder="••••••••"
                  value={formData.currentPassword}
                  onChange={(e) => setFormData({ ...formData, currentPassword: e.target.value })}
                  disabled={loading}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Contraseña Nueva
                </label>
                <Input
                  type="password"
                  placeholder="••••••••"
                  value={formData.newPassword}
                  onChange={(e) => setFormData({ ...formData, newPassword: e.target.value })}
                  disabled={loading}
                  variant={errors.newPassword ? 'error' : 'default'}
                />
                {errors.newPassword && (
                  <p className="mt-1 text-xs text-red-400">{errors.newPassword}</p>
                )}
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Confirmar Contraseña Nueva
                </label>
                <Input
                  type="password"
                  placeholder="••••••••"
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                  disabled={loading}
                  variant={errors.confirmPassword ? 'error' : 'default'}
                />
                {errors.confirmPassword && (
                  <p className="mt-1 text-xs text-red-400">{errors.confirmPassword}</p>
                )}
              </div>
            </div>
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
              {loading ? 'Guardando…' : 'Guardar Cambios'}
            </Button>
          </div>
        </form>

        <div className="mt-8 border-t border-white/10 pt-8">
          <Button
            variant="outline"
            onClick={() => {
              signOut().then(() => router.replace('/login'));
            }}
            className="w-full text-rose-400 hover:text-rose-300"
          >
            Cerrar Sesión
          </Button>
        </div>

        <div className="mt-6 text-center">
          <Link href="/" className="text-sm text-amber-400 hover:text-amber-300">
            ← Volver al Tablero
          </Link>
        </div>
      </Card>
    </div>
  );
}
