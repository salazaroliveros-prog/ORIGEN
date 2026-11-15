/**
 * ORIGEN ERP - Cierre Formal de Proyecto
 *
 * Página para cerrar un proyecto financieramente y administrativamente.
 * Es un Server Component que recibe params (Promise en Next.js 15) y
 * renderiza el componente cliente con el ID del proyecto.
 */

import { ProjectClosureContent } from './ProjectClosureContent.client';

export default async function ProjectClosurePage({
  params,
}: { params: Promise<{ id: string }> }) {
  const { id: projectId } = await params;
  return <ProjectClosureContent projectId={projectId} />;
}
