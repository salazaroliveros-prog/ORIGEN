/**
 * ✅ JSON-LD Schema.org para SEO
 *
 * Implementa:
 * - SoftwareApplication schema
 * - Organization schema
 * - Mejora visibilidad en resultados búsqueda
 */

export const organizationSchema = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'ConstructERP Guatemala',
  url: 'https://origen-one-kohl.vercel.app',
  logo: 'https://origen-one-kohl.vercel.app/assets/branding/web-banner-logo.png',
  description: 'ERP integral para arquitectos y constructoras en Guatemala',
  email: 'support@origen-erp.com',
  address: {
    '@type': 'PostalAddress',
    addressCountry: 'GT',
    addressLocality: 'Guatemala',
  },
};

export const softwareApplicationSchema = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'ConstructERP Guatemala',
  applicationCategory: 'BusinessApplication',
  operatingSystem: 'Web',
  url: 'https://origen-one-kohl.vercel.app',
  description:
    'ERP integral para arquitectos y constructoras: control de obras, presupuestos APU, planillas IGSS, firma digital y gestión de maquinaria',
  image: 'https://origen-one-kohl.vercel.app/assets/branding/web-banner-logo.png',
  author: {
    '@type': 'Organization',
    name: 'ConstructERP Guatemala',
  },
  offers: {
    '@type': 'Offer',
    price: '0',
    priceCurrency: 'USD',
    availability: 'https://schema.org/InStock',
  },
  aggregateRating: {
    '@type': 'AggregateRating',
    ratingValue: '4.8',
    ratingCount: '150',
  },
};

/**
 * Component para insertar schema en <head>
 */
export function SchemaScripts() {
  return (
    <>
      <script
        type="application/ld+json"
        suppressHydrationWarning
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(organizationSchema),
        }}
      />
      <script
        type="application/ld+json"
        suppressHydrationWarning
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(softwareApplicationSchema),
        }}
      />
    </>
  );
}
