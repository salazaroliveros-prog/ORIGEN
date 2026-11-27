/**
 * ORIGEN ERP - Política de Privacidad
 *
 * Página pública enlazada desde el registro. No usa datos del usuario: es un
 * Server Component estático.
 */

import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Política de Privacidad | ORIGEN ERP',
  description: 'Cómo ORIGEN ERP trata los datos de las empresas y sus colaboradores.',
};

const UPDATED_AT = '17 de noviembre de 2026';

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-10 text-slate-300">
      <Link href="/signup" className="text-sm text-amber-400 hover:text-amber-300">
        ← Volver al registro
      </Link>

      <h1 className="mt-6 text-3xl font-bold text-white">Política de Privacidad</h1>
      <p className="mt-2 text-sm text-slate-400">
        ORIGEN ERP Guatemala · Última actualización: {UPDATED_AT}
      </p>
      <p className="mt-3 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-200">
        Responsable del tratamiento: ORIGEN ERP Guatemala. Contacto para privacidad y derechos de
        los titulares:{' '}
        <a className="underline" href="mailto:salazaroliveros@gmail.com">
          salazaroliveros@gmail.com
        </a>
        .
      </p>

      <div className="mt-8 space-y-6 text-sm leading-relaxed">
        <section>
          <h2 className="text-lg font-semibold text-white">1. Datos que se tratan</h2>
          <p className="mt-2">
            Datos de la cuenta (nombre, correo electrónico, teléfono y foto de perfil), datos de la
            empresa (razón social, NIT, dirección, contacto y marca), información de proyectos
            (presupuestos, avance, ubicación y fotografías) y datos operativos como gastos,
            cotizaciones, maquinaria, asistencia y planillas.
          </p>
          <p className="mt-2">
            Las planillas pueden incluir datos personales de colaboradores (nombre, puesto, salario
            y afiliación al IGSS). La empresa usuaria es responsable de contar con la base legal
            para tratarlos.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white">2. Finalidad</h2>
          <p className="mt-2">
            Los datos se usan exclusivamente para operar el ERP: autenticar al usuario, separar la
            información por empresa, calcular presupuestos y planillas, generar reportes y mantener
            la trazabilidad de las operaciones.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white">3. Dónde se almacenan</h2>
          <p className="mt-2">
            La autenticación, la base de datos y los archivos se alojan en Firebase / Google Cloud
            (Firestore, Storage y Authentication). La aplicación se despliega en Vercel. Estos
            proveedores aplican sus propias medidas de seguridad y pueden procesar datos fuera de
            Guatemala.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white">4. Aislamiento por empresa</h2>
          <p className="mt-2">
            El acceso se controla con reglas de seguridad del lado del servidor: cada usuario solo
            puede leer o escribir la información de las empresas a las que pertenece, según su rol.
            Las credenciales nunca se almacenan en el repositorio ni en el navegador.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white">5. Conservación y eliminación</h2>
          <p className="mt-2">
            Los datos se conservan mientras la cuenta y la empresa estén activas. El propietario o
            un administrador puede eliminar registros desde la aplicación. Para eliminar una cuenta
            o una empresa completa, contacta al soporte de tu organización.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white">6. Derechos del titular</h2>
          <p className="mt-2">
            Puedes solicitar acceso, rectificación o eliminación de tus datos personales, así como
            oponerte a su tratamiento, escribiendo al administrador de tu empresa o al correo de
            soporte indicado en la aplicación.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white">7. Cookies y almacenamiento local</h2>
          <p className="mt-2">
            Se usan cookies y almacenamiento del navegador estrictamente necesarios para mantener la
            sesión y recordar preferencias de la interfaz. No se venden datos a terceros ni se usan
            para publicidad.
          </p>
        </section>
      </div>

      <div className="mt-10 border-t border-white/10 pt-6 text-sm">
        <Link href="/terms" className="text-amber-400 hover:text-amber-300">
          Ver Términos y Condiciones →
        </Link>
      </div>
    </main>
  );
}
