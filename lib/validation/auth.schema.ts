import { z } from 'zod';

export const LoginSchema = z.object({
  email: z
    .string()
    .min(1, 'El correo electrónico es requerido')
    .max(254, 'El correo es demasiado largo')
    .email('Correo electrónico inválido'),
  password: z
    .string()
    .min(1, 'La contraseña es requerida')
    .max(128, 'La contraseña es demasiado larga'),
});

export type LoginFormValues = z.infer<typeof LoginSchema>;

export function validateLoginForm(data: unknown) {
  return LoginSchema.safeParse(data);
}

export const RegisterSchema = z.object({
  email: z
    .string()
    .min(1, 'El correo electrónico es requerido')
    .max(254, 'El correo es demasiado largo')
    .email('Correo electrónico inválido'),
  password: z
    .string()
    .min(8, 'La contraseña debe tener al menos 8 caracteres')
    .max(128, 'La contraseña es demasiado larga')
    .regex(/[A-Z]/, 'Debe contener al menos una letra mayúscula')
    .regex(/[a-z]/, 'Debe contener al menos una letra minúscula')
    .regex(/[0-9]/, 'Debe contener al menos un número')
    .regex(/[^A-Za-z0-9]/, 'Debe contener al menos un carácter especial'),
  confirmPassword: z.string().min(1, 'Confirma tu contraseña'),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Las contraseñas no coinciden',
  path: ['confirmPassword'],
});

export type RegisterFormValues = z.infer<typeof RegisterSchema>;

export function validateRegisterForm(data: unknown) {
  return RegisterSchema.safeParse(data);
}
