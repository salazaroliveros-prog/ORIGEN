/**
 * ORIGEN ERP - Términos y Condiciones
 *
 * Página pública enlazada desde el registro. No usa datos del usuario: es un
 * Server Component estático.
 */

import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Términos y Condiciones | ORIGEN ERP',
  description: 'Condiciones de uso de ORIGEN ERP / ConstructERP Guatemala.',
};

const UPDATED_AT = '17 de noviembre de 2026';

export default function TermsPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-10 text-slate-300">
      <Link href="/signup" className="text-sm text-amber-400 hover:text-amber-300">
        ← Volver al registro
      </Link>

      <h1 className="mt-6 text-3xl font-bold text-white">Términos y Condiciones</h1>
      <p className="mt-2 text-sm text-slate-400">Última actualización: {UPDATED_AT}</p>

      <div className="mt-8 space-y-6 text-sm leading-relaxed">
        <section>
          <h2 className="text-lg font-semibold text-white">1. Objeto del servicio</h2>
          <p className="mt-2">
            ORIGEN ERP (también comercializado como ConstructERP Guatemala) es una aplicación de
            gestión para empresas de construcción y arquitectura. Permite administrar proyectos,
            presupuestos APU, planillas, asistencia, gastos, cotizaciones, maquinaria y facturas
            electrónicas (FEL) registradas manualmente a partir de documentos emitidos ante la SAT.
          </p>
          <p className="mt-2">
            La aplicación no emite, certifica ni transmite documentos tributarios ante la SAT. Los
            datos FEL se capturan a partir de facturas ya emitidas por el contribuyente.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white">2. Cuenta y acceso</h2>
          <p className="mt-2">
            El usuario es responsable de la veracidad de los datos de su cuenta, de mantener la
            confidencialidad de su contraseña y de las acciones realizadas desde su sesión. El
            acceso a cada empresa se controla por roles (propietario, administrador, Project
            Manager, finanzas, trabajador de campo y consulta).
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white">3. Uso aceptable</h2>
          <p className="mt-2">
            No está permitido usar el servicio para almacenar información ilícita, vulnerar derechos
            de terceros, intentar acceder a empresas ajenas ni interferir con la seguridad o
            disponibilidad del sistema.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white">4. Datos laborales y financieros</h2>
          <p className="mt-2">
            Los cálculos de planilla, IGSS, bono 14, aguinaldo, vacaciones, indemnización, IVA y
            presupuestos son herramientas de apoyo. La empresa usuaria debe validar los resultados
            con su contador, su asesor laboral y la normativa vigente antes de presentar
            declaraciones o pagos.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white">5. Disponibilidad y respaldo</h2>
          <p className="mt-2">
            El servicio se ofrece &quot;tal como está&quot;. Se realizan esfuerzos razonables para
            mantener la disponibilidad, pero no se garantiza un funcionamiento ininterrumpido. La
            empresa usuaria puede exportar su información desde la aplicación.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white">6. Limitación de responsabilidad</h2>
          <p className="mt-2">
            En la medida permitida por la ley guatemalteca, ORIGEN ERP no responde por daños
            indirectos, lucro cesante ni por decisiones tomadas con base en la información
            registrada por el usuario.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white">7. Cambios y contacto</h2>
          <p className="mt-2">
            Estos términos pueden actualizarse; la fecha de la última revisión se muestra al inicio.
            Para consultas escribe al administrador de tu empresa o al correo de soporte indicado en
            la aplicación.
          </p>
        </section>
      </div>

      <div className="mt-10 border-t border-white/10 pt-6 text-sm">
        <Link href="/privacy" className="text-amber-400 hover:text-amber-300">
          Ver Política de Privacidad →
        </Link>
      </div>
    </main>
  );
}
