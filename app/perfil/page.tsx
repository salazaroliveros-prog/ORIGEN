/**
 * ORIGEN ERP - Perfil de Usuario
 *
 * Página para editar los datos del usuario autenticado:
 * nombre, correo, teléfono, contraseña y foto de perfil.
 */

'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import {
  EmailAuthProvider,
  reauthenticateWithCredential,
  updateProfile,
  updatePassword,
} from 'firebase/auth';
import { useAuthSession } from '@/lib/hooks/useAuthSession';
import {
  getAuthOrThrow,
  getUserProfileFromFirestore,
  saveUserProfileToFirestore,
} from '@/lib/firebaseService';
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

const EMPTY_FORM: ProfileFormData = {
  displayName: '',
  phoneNumber: '',
  currentPassword: '',
  newPassword: '',
  confirmPassword: '',
};

export default function ProfilePage() {
  const router = useRouter();
  const { currentUser, status, signOut } = useAuthSession();
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formData, setFormData] = useState<ProfileFormData>(EMPTY_FORM);

  // Cargar nombre de Auth y teléfono privado guardado en Firestore.
  useEffect(() => {
    let active = true;
    if (!currentUser) return () => { active = false; };

    setFormData((prev) => ({
      ...prev,
      displayName: currentUser.displayName ?? '',
      phoneNumber: currentUser.phoneNumber ?? '',
    }));

    void getUserProfileFromFirestore(currentUser.uid)
      .then((savedProfile) => {
        if (!active) return;
        setFormData((prev) => ({
          ...prev,
          phoneNumber: savedProfile?.phoneNumber ?? currentUser.phoneNumber ?? '',
        }));
      })
      .catch((error: unknown) => {
        if (active) console.error('No se pudo cargar el teléfono del perfil:', error);
      });

    return () => {
      active = false;
    };
  }, [currentUser]);

  // Página privada: si la sesión terminó sin usuario o falló, volver al login.
  useEffect(() => {
    if (status === 'unauthenticated' || status === 'error') {
      router.replace('/login');
    }
  }, [status, router]);

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
    if (formData.newPassword && !formData.currentPassword.trim()) {
      newErrors.currentPassword = 'Ingresa tu contraseña actual para confirmar el cambio';
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
      // Firebase Auth solo permite actualizar displayName/photoURL con updateProfile.
      if (formData.displayName.trim()) {
        await updateProfile(currentUser, { displayName: formData.displayName.trim() });
      }
      // El teléfono se almacena en un documento privado por UID con reglas de propietario.
      await saveUserProfileToFirestore(currentUser.uid, {
        phoneNumber: formData.phoneNumber,
      });

      // Cambiar contraseña: Firebase exige reautenticación reciente.
      if (formData.newPassword) {
        const auth = getAuthOrThrow();
        const user = auth.currentUser ?? currentUser;
        if (!user.email) {
          throw new Error('No se pudo determinar el correo de la cuenta.');
        }
        const credential = EmailAuthProvider.credential(user.email, formData.currentPassword);
        await reauthenticateWithCredential(user, credential);
        await updatePassword(user, formData.newPassword);
      }

      toast.success('Perfil actualizado correctamente.');
      setFormData((prev) => ({
        ...prev,
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      }));
      setTimeout(() => {
        router.replace('/');
      }, 1500);
    } catch (error) {
      const code = (error as { code?: string })?.code ?? '';
      const message =
        code === 'auth/wrong-password' || code === 'auth/invalid-credential'
          ? 'La contraseña actual es incorrecta.'
          : code === 'auth/requires-recent-login'
            ? 'Por seguridad, inicia sesión nuevamente antes de cambiar la contraseña.'
            : error instanceof Error
              ? error.message
              : 'Error al actualizar perfil';
      setErrors({ general: message });
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  if (status === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950">
        <div className="text-center">
          <div className="flex h-8 w-8 items-center justify-center rounded-full border-4 border-brand-primary/30 border-t-brand-primary animate-spin mb-4" />
          <p className="text-slate-400">Cargando perfil…</p>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-slate-950 px-4 text-center">
        <Card variant="glass" padding="lg" className="max-w-md">
          <h1 className="text-xl font-bold text-white">Sesión no iniciada</h1>
          <p className="mt-2 text-sm text-slate-400">
            Inicia sesión para ver y editar tu perfil. Serás redirigido al login en unos segundos.
          </p>
          <div className="mt-4 flex justify-center gap-2">
            <Button variant="primary" size="md" onClick={() => router.replace('/login')}>
              Ir a iniciar sesión
            </Button>
            <Button variant="ghost" size="md" onClick={() => void signOut()}>
              Cerrar sesión
            </Button>
          </div>
        </Card>
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

        {errors.general && (
          <div className="mb-6 flex gap-3 rounded-lg border border-red-500/30 bg-red-500/10 p-4">
            <p className="text-xs text-red-600">{errors.general}</p>
          </div>
        )}

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

          <div className="pt-6 border-t border-white/10">
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
                  variant={errors.currentPassword ? 'error' : 'default'}
                />
                {errors.currentPassword && (
                  <p className="mt-1 text-xs text-red-400">{errors.currentPassword}</p>
                )}
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
      </Card>

      <div className="mt-6 text-center">
        <Button
          variant="outline"
          size="sm"
          onClick={() => router.replace('/')}
          className="text-slate-400 hover:text-amber-300"
        >
          ← Volver al inicio
        </Button>
      </div>
    </div>
  );
}