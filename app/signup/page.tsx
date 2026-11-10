/**
 * ORIGEN ERP - Sign Up Page
 * User registration and account creation
 */

'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AlertCircle, Loader, Eye, EyeOff, Check } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { createEmailAccount } from '@/lib/firebaseAuth';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { validateRegisterForm, RegisterFormValues } from '@/lib/validation/auth.schema';

interface SignUpFormData {
  fullName: string;
  email: string;
  password: string;
  confirmPassword: string;
  company: string;
  phone: string;
}

interface PasswordStrength {
  score: number;
  label: string;
  color: string;
}

export default function SignUpPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  const [formData, setFormData] = useState<SignUpFormData>({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
    company: '',
    phone: '',
  });

  const calculatePasswordStrength = (password: string): PasswordStrength => {
    let score = 0;

    if (password.length >= 8) score++;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
    if (/\d/.test(password)) score++;
    if (/[!@#$%^&*]/.test(password)) score++;

    const labels = ['Muy débil', 'Débil', 'Aceptable', 'Fuerte', 'Muy fuerte'];
    const colors = [
      'text-rose-500',
      'text-orange-500',
      'text-amber-500',
      'text-emerald-500',
      'text-sky-500',
    ];

    return {
      score,
      label: labels[score] || 'Muy débil',
      color: colors[score] || 'text-red-500',
    };
  };

  const passwordStrength = calculatePasswordStrength(formData.password);

  const validateEmailFormat = (email: string): boolean => {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
  };

  const validateForm = (): boolean => {
    const validation = validateRegisterForm({
      email: formData.email,
      password: formData.password,
      confirmPassword: formData.confirmPassword,
    });

    const newErrors: Record<string, string> = {};

    if (!validation.success) {
      for (const issue of validation.error.issues) {
        const path = issue.path[0] as string;
        newErrors[path] = issue.message;
      }
    }

    if (!formData.fullName.trim()) {
      newErrors.fullName = 'El nombre completo es requerido';
    }

    if (!formData.company.trim()) {
      newErrors.company = 'El nombre de la empresa es requerido';
    }

    if (!formData.phone.trim()) {
      newErrors.phone = 'El teléfono es requerido';
    }

    if (!agreedToTerms) {
      newErrors.terms = 'Debes aceptar los términos y condiciones';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      toast.error('Por favor completa todos los campos');
      return;
    }

    try {
      setLoading(true);

      const result = await createEmailAccount(formData.email, formData.password);

      if (!result.user) {
        setErrors({ general: 'Error al crear cuenta' });
        toast.error('Error al crear cuenta');
        return;
      }

      toast.success('¡Cuenta creada exitosamente!');
      setFormData({
        fullName: '',
        email: '',
        password: '',
        confirmPassword: '',
        company: '',
        phone: '',
      });
      setErrors({});

      setTimeout(() => {
        router.push('/dashboard');
      }, 1500);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error de registro';
      setErrors({ general: message });
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 p-4">
      <div className="w-full max-w-md">
        <Card variant="glass-l2" padding="lg" className="mx-auto w-full max-w-md shadow-glass-xl">
          <div className="mb-8 text-center">
            <h1 className="mb-2 text-3xl font-bold text-white">ORIGEN ERP</h1>
            <p className="text-slate-400">Crea tu cuenta</p>
          </div>

          {errors.general && (
            <div className="mb-6 flex gap-3 rounded-lg border border-amber-500/30 bg-amber-500/10 p-4">
              <AlertCircle
                className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-500"
                aria-hidden="true"
              />
              <p className="text-xs text-amber-600">{errors.general}</p>
            </div>
          )}

          <form onSubmit={handleSignUp} className="space-y-4">
            <Input
              label="Nombre Completo"
              type="text"
              placeholder="Tu nombre completo"
              value={formData.fullName}
              onChange={(e) => {
                setFormData({ ...formData, fullName: e.target.value });
                if (errors.fullName) setErrors({ ...errors, fullName: '' });
              }}
              disabled={loading}
              required
              autoComplete="name"
              error={errors.fullName}
            />
            {errors.fullName && <p className="mt-1 text-xs text-red-400">{errors.fullName}</p>}

            <Input
              label="Correo Electrónico"
              type="email"
              placeholder="tu@correo.com"
              value={formData.email}
              onChange={(e) => {
                setFormData({ ...formData, email: e.target.value });
                if (errors.email) setErrors({ ...errors, email: '' });
              }}
              disabled={loading}
              required
              autoComplete="email"
              error={errors.email}
            />
            {errors.email && <p className="mt-1 text-xs text-red-400">{errors.email}</p>}

            <Input
              label="Empresa"
              type="text"
              placeholder="Nombre de tu empresa"
              value={formData.company}
              onChange={(e) => {
                setFormData({ ...formData, company: e.target.value });
                if (errors.company) setErrors({ ...errors, company: '' });
              }}
              disabled={loading}
              required
              autoComplete="organization"
              error={errors.company}
            />
            {errors.company && <p className="mt-1 text-xs text-red-400">{errors.company}</p>}

            <Input
              label="Teléfono"
              type="tel"
              placeholder="+502 1234-5678"
              value={formData.phone}
              onChange={(e) => {
                setFormData({ ...formData, phone: e.target.value });
                if (errors.phone) setErrors({ ...errors, phone: '' });
              }}
              disabled={loading}
              required
              autoComplete="tel"
              error={errors.phone}
            />
            {errors.phone && <p className="mt-1 text-xs text-red-400">{errors.phone}</p>}

            <Input
              label="Contraseña"
              type={showPassword ? 'text' : 'password'}
              placeholder="••••••••"
              value={formData.password}
              onChange={(e) => {
                setFormData({ ...formData, password: e.target.value });
                if (errors.password) setErrors({ ...errors, password: '' });
              }}
              disabled={loading}
              required
              autoComplete="new-password"
              minLength={8}
              error={errors.password}
              rightIcon={
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={loading}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition-colors hover:text-slate-300 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              }
            />
            {errors.password && <p className="mt-1 text-xs text-red-400">{errors.password}</p>}

            {formData.password && (
              <div className="mt-2 space-y-1">
                <div className="flex gap-1">
                  {[...Array(5)].map((_, i) => (
                    <div
                      key={i}
                      className={`h-1 flex-1 rounded-full transition-colors ${
                        i < passwordStrength.score ? 'bg-amber-500' : 'bg-white/[0.1]'
                      }`}
                    />
                  ))}
                </div>
                <p className={`text-xs font-semibold ${passwordStrength.color}`}>
                  {passwordStrength.label}
                </p>
              </div>
            )}

            <Input
              label="Confirmar Contraseña"
              type={showConfirmPassword ? 'text' : 'password'}
              placeholder="••••••••"
              value={formData.confirmPassword}
              onChange={(e) => {
                setFormData({ ...formData, confirmPassword: e.target.value });
                if (errors.confirmPassword) setErrors({ ...errors, confirmPassword: '' });
              }}
              disabled={loading}
              required
              autoComplete="new-password"
              error={errors.confirmPassword}
              rightIcon={
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  disabled={loading}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition-colors hover:text-slate-300 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-5 w-5" aria-hidden="true" />
                  ) : (
                    <Eye className="h-5 w-5" aria-hidden="true" />
                  )}
                </button>
              }
            />
            {errors.confirmPassword && (
              <p className="mt-1 text-xs text-red-400">{errors.confirmPassword}</p>
            )}

            {formData.password && formData.confirmPassword && (
              <div
                className={`mt-2 flex items-center gap-1 text-xs font-semibold ${
                  formData.password === formData.confirmPassword
                    ? 'text-emerald-500'
                    : 'text-rose-500'
                }`}
              >
                {formData.password === formData.confirmPassword ? (
                  <>
                    <Check className="h-4 w-4" aria-hidden="true" />
                    Las contraseñas coinciden
                  </>
                ) : (
                  <>
                    <AlertCircle className="h-4 w-4" aria-hidden="true" />
                    Las contraseñas no coinciden
                  </>
                )}
              </div>
            )}

            <div className="flex items-start gap-3">
              <input
                id="terms"
                type="checkbox"
                checked={agreedToTerms}
                onChange={(e) => {
                  setAgreedToTerms(e.target.checked);
                  if (errors.terms) setErrors({ ...errors, terms: '' });
                }}
                disabled={loading}
                className="mt-1 h-4 w-4 rounded border-white/10 bg-white/[0.03] text-amber-500 focus:ring-2 focus:ring-brand-secondary/50"
              />
              <label htmlFor="terms" className="text-xs text-slate-400">
                Acepto los{' '}
                <Link href="/terms" className="text-amber-400 hover:text-amber-300">
                  términos y condiciones
                </Link>{' '}
                y la{' '}
                <Link href="/privacy" className="text-amber-400 hover:text-amber-300">
                  política de privacidad
                </Link>
                *
              </label>
            </div>
            {errors.terms && <p className="text-xs text-red-400">{errors.terms}</p>}

            <Button
              type="submit"
              variant="primary"
              size="lg"
              isLoading={loading}
              disabled={loading}
              className="mt-4 w-full"
            >
              {loading ? 'Creando cuenta…' : 'Crear Cuenta'}
            </Button>
          </form>

          <div className="mt-6 border-t border-white/10 pt-6 text-center">
            <p className="text-sm text-slate-400">
              ¿Ya tienes cuenta?{' '}
              <Link href="/" className="font-medium text-amber-400 hover:text-amber-300">
                Inicia sesión aquí
              </Link>
            </p>
          </div>
        </Card>
      </div>

      <p className="mt-6 text-center text-sm text-slate-400">
        © 2024 ORIGEN ERP. Todos los derechos reservados.
      </p>
    </div>
  );
}
