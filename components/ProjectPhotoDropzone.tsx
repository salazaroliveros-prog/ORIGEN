'use client';

import Image from 'next/image';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, AlertCircle } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { authFetch } from '@/lib/apiClient';
import type { ProjectPhotoRecord } from '@/lib/types';

interface ProjectPhotoDropzoneProps {
  projectId: string;
  projectCode: string;
  onPhotoUploaded: (
    photoUrl: string,
    metadata: {
      id: string;
      filename: string;
      storagePath: string;
      uploadedAt: string;
      size: number;
    }
  ) => Promise<void> | void;
  savedPhotos?: ProjectPhotoRecord[];
  maxFiles?: number;
  maxSizeMB?: number;
  disabled?: boolean;
}

export function ProjectPhotoDropzone({
  projectId,
  projectCode,
  onPhotoUploaded,
  savedPhotos = [],
  maxFiles = 5,
  maxSizeMB = 10,
  disabled = false,
}: ProjectPhotoDropzoneProps) {
  const [uploading, setUploading] = useState(false);
  const uploadedObjectUrls = useRef(new Set<string>());
  const [uploadedFiles, setUploadedFiles] = useState<
    Array<{
      id: string;
      url: string;
      filename: string;
      uploadedAt: string;
      size: number;
    }>
  >([]);

  const [savedFiles, setSavedFiles] = useState<Array<{
    id: string;
    url: string;
    filename: string;
    uploadedAt: string;
    size: number;
  }>>([]);

  useEffect(() => {
    let active = true;
    const objectUrls: string[] = [];
    const loadSavedPhotos = async () => {
      const results = await Promise.all(savedPhotos.map(async (photo) => {
        try {
          const response = await authFetch(
            `/api/project-photos/${encodeURIComponent(projectId)}/${encodeURIComponent(photo.id)}`
          );
          if (!response.ok) return null;
          const objectUrl = URL.createObjectURL(await response.blob());
          objectUrls.push(objectUrl);
          return {
            id: photo.id,
            url: objectUrl,
            filename: photo.filename,
            uploadedAt: photo.uploadedAt,
            size: photo.size,
          };
        } catch {
          return null;
        }
      }));
      if (active) setSavedFiles(results.filter((photo): photo is NonNullable<typeof photo> => photo !== null));
    };
    void loadSavedPhotos();
    return () => {
      active = false;
      objectUrls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [projectId, savedPhotos]);

  // When the Firestore listener confirms metadata for a new upload, stop
  // using the temporary preview URL; the authenticated GET now owns its view.
  useEffect(() => {
    const savedIds = new Set(savedPhotos.map((photo) => photo.id));
    if (savedIds.size === 0) return;
    setUploadedFiles((current) => {
      const confirmed = current.filter((file) => savedIds.has(file.id));
      confirmed.forEach((file) => {
        URL.revokeObjectURL(file.url);
        uploadedObjectUrls.current.delete(file.url);
      });
      return current.filter((file) => !savedIds.has(file.id));
    });
  }, [savedPhotos]);

  useEffect(() => () => {
    uploadedObjectUrls.current.forEach((url) => URL.revokeObjectURL(url));
    uploadedObjectUrls.current.clear();
  }, []);

  const displayedFiles = useMemo(() => {
    const savedIds = new Set(savedFiles.map((file) => file.id));
    return [
      ...savedFiles,
      ...uploadedFiles.filter((file) => !savedIds.has(file.id)),
    ];
  }, [savedFiles, uploadedFiles]);

  const remainingSlots = Math.max(0, maxFiles - savedPhotos.length - uploadedFiles.length);

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      if (disabled) return;

      setUploading(true);

      try {
        for (const file of acceptedFiles) {
          // Validar que sea imagen
          if (!file.type.startsWith('image/')) {
            toast.error(`"${file.name}" no es una imagen válida`);
            continue;
          }

          // Subir a Firebase Storage (la ruta API exige sesión y aplica reglas)
          const formData = new FormData();
          formData.append('file', file);
          formData.append('projectId', projectId);
          formData.append('projectCode', projectCode);

          const response = await authFetch('/api/upload-project-photo', {
            method: 'POST',
            body: formData,
          });

          if (!response.ok) {
            const error = await response.json().catch(() => null);
            throw new Error((error && (error.error || error.message)) || 'Error al subir la foto');
          }

          const data = await response.json();

          const photoMetadata = {
            id: data.photoId as string,
            filename: file.name,
            storagePath: data.storagePath as string,
            uploadedAt: data.uploadedAt as string,
            size: file.size,
          };
          if (!photoMetadata.id || !photoMetadata.storagePath || !photoMetadata.uploadedAt) {
            throw new Error('El servidor no devolvió la referencia completa de la foto.');
          }

          await onPhotoUploaded('', photoMetadata);
          toast.success(`Foto "${file.name}" guardada y vinculada al proyecto`);

          // Preview is served through the authenticated project-photo API.
          // The download token returned by Storage is deliberately not used
          // in the browser or stored in the project record.
          try {
            const previewResponse = await authFetch(
              `/api/project-photos/${encodeURIComponent(projectId)}/${encodeURIComponent(photoMetadata.id)}`
            );
            if (!previewResponse.ok) {
              throw new Error('La foto se guardó, pero no se pudo cargar la previsualización.');
            }
            const previewUrl = URL.createObjectURL(await previewResponse.blob());
            uploadedObjectUrls.current.add(previewUrl);
            setUploadedFiles((prev) => [...prev, {
              ...photoMetadata,
              url: previewUrl,
            }]);
          } catch (previewError) {
            console.warn('La foto se guardó; la previsualización se cargará desde el registro del proyecto.', previewError);
          }
        }
      } catch (error) {
        console.error('Error uploading photos:', error);
        toast.error('Error al subir las fotos. Intenta nuevamente.');
      } finally {
        setUploading(false);
      }
    },
    [projectId, projectCode, onPhotoUploaded, disabled]
  );

  const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.webp'],
    },
    maxFiles: remainingSlots,
    maxSize: maxSizeMB * 1024 * 1024,
    disabled: disabled || remainingSlots === 0,
  });

  return (
    <div className="space-y-4">
      {/* Dropzone */}
      <div
        {...getRootProps()}
        className={`relative cursor-pointer rounded-xl border-2 border-dashed p-8 text-center transition ${isDragActive ? 'border-blue-500 bg-blue-50' : 'border-slate-300 hover:border-slate-400'} ${isDragReject ? 'border-red-500 bg-red-50' : ''} ${disabled ? 'cursor-not-allowed opacity-50' : ''} ${uploading ? 'pointer-events-none' : ''} `}
      >
        <input {...getInputProps()} />
        <div className="flex flex-col items-center gap-3">
          {uploading ? (
            <>
              <div className="h-12 w-12 animate-spin rounded-full border-4 border-slate-300 border-t-blue-500" />
              <p className="text-sm text-slate-600">Subiendo fotos...</p>
            </>
          ) : (
            <>
              <Upload className="h-12 w-12 text-slate-400" />
              <div>
                <p className="text-sm font-medium text-slate-700">
                  {isDragActive
                    ? 'Suelta las fotos aquí'
                    : 'Arrastra fotos o haz clic para seleccionar'}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  PNG, JPG, WEBP (máx. {maxSizeMB}MB, {maxFiles} fotos en el proyecto)
                </p>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Lista de fotos subidas */}
      {displayedFiles.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-slate-700">
            Fotos del proyecto ({displayedFiles.length})
          </p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
            {displayedFiles.map((file) => (
              <div key={file.id} className="group relative">
                <div className="aspect-square overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
                  <Image
                    src={file.url}
                    alt={file.filename}
                    className="h-full w-full object-cover"
                    width={800}
                    height={800}
                    quality={80}
                  />
                </div>
                <div className="absolute bottom-0 left-0 right-0 rounded-b-lg bg-black/60 p-1.5 text-xs text-white">
                  <p className="truncate">{file.filename}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Info badge */}
      <div className="flex items-start gap-2 rounded-lg border border-blue-200 bg-blue-50 p-3">
        <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-blue-600" />
        <div className="text-xs text-blue-800">
          <p className="font-medium">Las fotos se almacenan y quedan vinculadas al proyecto</p>
          <p className="mt-1">
            El acceso a los archivos requiere sesión y permisos del proyecto. Carpeta:{' '}
            <code className="rounded bg-blue-100 px-1">/projects/{projectId}/progress</code>
          </p>
        </div>
      </div>
    </div>
  );
}
