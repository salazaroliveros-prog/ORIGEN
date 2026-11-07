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

interface SignUpFormData {
  fullName: string;
  email: string;
  password: string;
  confirmPassword: string;
  company: string;
  phone: string;
}

interface FormErrors {
  [key: string]: string;
}

interface PasswordStrength {
  score: number; // 0-4
  label: string;
  color: string;
}

export default function SignUpPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  const [formData, setFormData] = useState<SignUpFormData>({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
    company: '',
    phone: '',
  });

  // Calculate password strength
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

  // Validate email format
  const validateEmailFormat = (email: string): boolean => {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
  };

  // Validate form
  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.fullName.trim()) {
      newErrors.fullName = 'El nombre completo es requerido';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'El correo es requerido';
    } else if (!validateEmailFormat(formData.email)) {
      newErrors.email = 'Ingresa un correo válido';
    }

    if (!formData.password) {
      newErrors.password = 'La contraseña es requerida';
    } else if (formData.password.length < 6) {
      newErrors.password = 'La contraseña debe tener al menos 6 caracteres';
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Confirma tu contraseña';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Las contraseñas no coinciden';
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

  // Handle sign up
  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      toast.error('Por favor completa todos los campos');
      return;
    }

    try {
      setLoading(true);

      // Call Firebase signup
      const result = await createEmailAccount(formData.email, formData.password);

      // createEmailAccount returns EmailAccountCreationResult with user and verificationEmailSent
      if (!result.user) {
        setErrors({
          general: 'Error al crear cuenta',
        });
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

      // Redirect to dashboard
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
        {/* Card */}
        <div className="rounded-2xl border border-white/10 bg-slate-900/90 backdrop-blur-md p-8 shadow-2xl">
          {/* Header */}
          <div className="mb-8 text-center">
            <h1 className="mb-2 text-3xl font-bold text-white">ORIGEN ERP</h1>
            <p className="text-slate-400">Crea tu cuenta</p>
          </div>

          {/* General Error Alert */}
          {errors.general && (
            <div className="mb-6 flex gap-3 rounded-lg border border-amber-500/30 bg-amber-500/10 p-4">
              <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-500" />
              <p className="text-xs text-amber-600">{errors.general}</p>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSignUp} className="space-y-4">
            {/* Full Name */}
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-300">
                Nombre Completo *
              </label>
              <input
                type="text"
                value={formData.fullName}
                onChange={(e) => {
                  setFormData({ ...formData, fullName: e.target.value });
                  if (errors.fullName) setErrors({ ...errors, fullName: '' });
                }}
                placeholder="Tu nombre completo"
                disabled={loading}
                className={`w-full rounded-lg border px-4 py-2 ${
                  errors.fullName ? 'border-red-500 bg-red-500/5' : 'border-white/10 bg-white/[0.03]'
                } text-white placeholder-slate-500 transition-all focus:border-transparent focus:ring-2 focus:ring-brand-secondary/50 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50`}
              />
              {errors.fullName && <p className="mt-1 text-xs text-red-400">{errors.fullName}</p>}
            </div>

            {/* Email */}
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-300">
                Correo Electrónico *
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => {
                  setFormData({ ...formData, email: e.target.value });
                  if (errors.email) setErrors({ ...errors, email: '' });
                }}
                placeholder="tu@correo.com"
                disabled={loading}
                className={`w-full rounded-lg border px-4 py-2 ${
                  errors.email ? 'border-red-500 bg-red-500/5' : 'border-white/10 bg-white/[0.03]'
                } text-white placeholder-slate-500 transition-all focus:border-transparent focus:ring-2 focus:ring-brand-secondary/50 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50`}
              />
              {errors.email && <p className="mt-1 text-xs text-red-400">{errors.email}</p>}
            </div>

            {/* Company */}
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-300">Empresa *</label>
              <input
                type="text"
                value={formData.company}
                onChange={(e) => {
                  setFormData({ ...formData, company: e.target.value });
                  if (errors.company) setErrors({ ...errors, company: '' });
                }}
                placeholder="Nombre de tu empresa"
                disabled={loading}
                className={`w-full rounded-lg border px-4 py-2 ${
                  errors.company ? 'border-red-500 bg-red-500/5' : 'border-white/10 bg-white/[0.03]'
                } text-white placeholder-slate-500 transition-all focus:border-transparent focus:ring-2 focus:ring-brand-secondary/50 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50`}
              />
              {errors.company && <p className="mt-1 text-xs text-red-400">{errors.company}</p>}
            </div>

            {/* Phone */}
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-300">Teléfono *</label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => {
                  setFormData({ ...formData, phone: e.target.value });
                  if (errors.phone) setErrors({ ...errors, phone: '' });
                }}
                placeholder="+502 1234-5678"
                disabled={loading}
                className={`w-full rounded-lg border px-4 py-2 ${
                  errors.phone ? 'border-red-500 bg-red-500/5' : 'border-white/10 bg-white/[0.03]'
                } text-white placeholder-slate-500 transition-all focus:border-transparent focus:ring-2 focus:ring-brand-secondary/50 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50`}
              />
              {errors.phone && <p className="mt-1 text-xs text-red-400">{errors.phone}</p>}
            </div>

            {/* Password */}
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-300">Contraseña *</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={(e) => {
                    setFormData({ ...formData, password: e.target.value });
                    if (errors.password) setErrors({ ...errors, password: '' });
                  }}
                  placeholder="••••••••"
                  disabled={loading}
                  className={`w-full rounded-lg border px-4 py-2 pr-12 ${
                    errors.password
                      ? 'border-red-500 bg-red-500/5'
                      : 'border-white/10 bg-white/[0.03]'
                  } text-white placeholder-slate-500 transition-all focus:border-transparent focus:ring-2 focus:ring-brand-secondary/50 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={loading}
                  className="absolute top-1/2 right-3 -translate-y-1/2 text-slate-400 transition-colors hover:text-slate-300"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>

              {/* Password Strength */}
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

              {errors.password && <p className="mt-1 text-xs text-red-400">{errors.password}</p>}
            </div>

            {/* Confirm Password */}
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-300">
                Confirmar Contraseña *
              </label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={formData.confirmPassword}
                  onChange={(e) => {
                    setFormData({ ...formData, confirmPassword: e.target.value });
                    if (errors.confirmPassword) setErrors({ ...errors, confirmPassword: '' });
                  }}
                  placeholder="••••••••"
                  disabled={loading}
                  className={`w-full rounded-lg border px-4 py-2 pr-12 ${
                    errors.confirmPassword
                      ? 'border-red-500 bg-red-500/5'
                      : 'border-white/10 bg-white/[0.03]'
                  } text-white placeholder-slate-500 transition-all focus:border-transparent focus:ring-2 focus:ring-brand-secondary/50 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50`}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  disabled={loading}
                  className="absolute top-1/2 right-3 -translate-y-1/2 text-slate-400 transition-colors hover:text-slate-300"
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              </div>
              {errors.confirmPassword && (
                <p className="mt-1 text-xs text-red-400">{errors.confirmPassword}</p>
              )}

              {/* Passwords match indicator */}
              {formData.password && formData.confirmPassword && (
                <div
                  className={`mt-2 flex items-center gap-1 text-xs font-semibold ${
                    formData.password === formData.confirmPassword
                      ? 'text-green-500'
                      : 'text-red-500'
                  }`}
                >
                  {formData.password === formData.confirmPassword ? (
                    <>
                      <Check className="h-4 w-4" />
                      Las contraseñas coinciden
                    </>
                  ) : (
                    <>
                      <AlertCircle className="h-4 w-4" />
                      Las contraseñas no coinciden
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Terms and Conditions */}
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

            {/* Sign Up Button */}
            <button
              type="submit"
              disabled={loading}
              className="mt-6 flex w-full items-center justify-center gap-2 rounded-lg bg-amber-500 px-4 py-2 font-semibold text-slate-950 transition-all hover:bg-amber-400 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader className="h-4 w-4 animate-spin" />
                  Creando cuenta...
                </>
              ) : (
                'Crear Cuenta'
              )}
            </button>
          </form>

          {/* Login Link */}
          <div                 className="mt-6 border-t border-white/10 pt-6 text-center">
            <p className="text-sm text-slate-400">
              ¿Ya tienes cuenta?{' '}
              <Link href="/" className="font-medium text-amber-400 hover:text-amber-300">
                Inicia sesión aquí
              </Link>
            </p>
          </div>
        </div>

        {/* Footer */}
        <p className="mt-6 text-center text-xs text-slate-500">
          © 2024 ORIGEN ERP. Todos los derechos reservados.
        </p>
      </div>
    </div>
  );
}
