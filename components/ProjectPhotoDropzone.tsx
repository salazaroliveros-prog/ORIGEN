/* eslint-disable @next/next/no-img-element */
'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Trash2, Upload, AlertCircle } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { authFetch } from '@/lib/apiClient';
import { compressImageFile } from '@/lib/imageCompression';
import type { ProjectPhotoRecord } from '@/lib/types';

interface PhotoMetadata {
  id: string;
  filename: string;
  uploadedAt: string;
  size: number;
  dataUrl: string;
  mime: string;
  width: number;
  height: number;
  compressedSize: number;
}

interface ProjectPhotoDropzoneProps {
  projectId: string;
  projectCode: string;
  onPhotoUploaded: (photoDataUrl: string, metadata: PhotoMetadata) => Promise<void> | void;
  onPhotoDelete?: (photoId: string) => Promise<void> | void;
  savedPhotos?: ProjectPhotoRecord[];
  maxFiles?: number;
  maxSizeMB?: number;
  disabled?: boolean;
}

interface DisplayFile {
  id: string;
  url: string;
  filename: string;
  uploadedAt: string;
  size: number;
  saved: boolean;
}

function buildPhotoId(): string {
  return `photo_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export function ProjectPhotoDropzone({
  projectId,
  projectCode,
  onPhotoUploaded,
  onPhotoDelete,
  savedPhotos = [],
  maxFiles = 5,
  maxSizeMB = 10,
  disabled = false,
}: ProjectPhotoDropzoneProps) {
  const [uploading, setUploading] = useState(false);
  const objectUrls = useRef<string[]>([]);
  const [uploadedFiles, setUploadedFiles] = useState<DisplayFile[]>([]);
  const [savedFiles, setSavedFiles] = useState<DisplayFile[]>([]);
  const [deleting, setDeleting] = useState<string | null>(null);

  // Las fotos nuevas traen su data URL; las legacy se sirven por la API autenticada.
  useEffect(() => {
    let active = true;
    const createdUrls: string[] = [];
    const load = async () => {
      const results = await Promise.all(
        savedPhotos.map(async (photo): Promise<DisplayFile | null> => {
          if (photo.dataUrl) {
            return {
              id: photo.id,
              url: photo.dataUrl,
              filename: photo.filename,
              uploadedAt: photo.uploadedAt,
              size: photo.compressedSize ?? photo.size,
              saved: true,
            };
          }
          try {
            const response = await authFetch(
              `/api/project-photos/${encodeURIComponent(projectId)}/${encodeURIComponent(photo.id)}`
            );
            if (!response.ok) return null;
            const url = URL.createObjectURL(await response.blob());
            createdUrls.push(url);
            return {
              id: photo.id,
              url,
              filename: photo.filename,
              uploadedAt: photo.uploadedAt,
              size: photo.size,
              saved: true,
            };
          } catch {
            return null;
          }
        })
      );
      if (active) setSavedFiles(results.filter((photo): photo is DisplayFile => photo !== null));
    };
    void load();
    return () => {
      active = false;
      createdUrls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [projectId, savedPhotos]);

  useEffect(() => {
    return () => objectUrls.current.forEach((url) => URL.revokeObjectURL(url));
  }, []);

  const displayedFiles = useMemo(() => {
    const savedIds = new Set(savedFiles.map((file) => file.id));
    return [...savedFiles, ...uploadedFiles.filter((file) => !savedIds.has(file.id))];
  }, [savedFiles, uploadedFiles]);

  const remainingSlots = Math.max(0, maxFiles - savedPhotos.length - uploadedFiles.length);

  const handleDelete = async (photoId: string) => {
    if (!onPhotoDelete || deleting) return;
    setDeleting(photoId);
    try {
      await onPhotoDelete(photoId);
      setSavedFiles((current) => current.filter((photo) => photo.id !== photoId));
      toast.success('Foto eliminada del proyecto');
    } catch (error) {
      console.error('Error eliminando foto:', error);
      toast.error('No se pudo eliminar la foto.');
    } finally {
      setDeleting(null);
    }
  };

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      if (disabled) return;
      setUploading(true);
      try {
        for (const file of acceptedFiles) {
          if (!file.type.startsWith('image/')) {
            toast.error(`"${file.name}" no es una imagen válida`);
            continue;
          }
          // Comprimir en el navegador: la foto se guarda como código base64 en
          // Firestore, sin depender de un bucket de Storage (plan Spark).
          const compressed = await compressImageFile(file);
          const metadata: PhotoMetadata = {
            id: buildPhotoId(),
            filename: file.name,
            uploadedAt: new Date().toISOString(),
            size: file.size,
            dataUrl: compressed.dataUrl,
            mime: compressed.mime,
            width: compressed.width,
            height: compressed.height,
            compressedSize: compressed.bytes,
          };
          await onPhotoUploaded(compressed.dataUrl, metadata);
          setUploadedFiles((current) => [
            ...current,
            {
              id: metadata.id,
              url: compressed.dataUrl,
              filename: file.name,
              uploadedAt: metadata.uploadedAt,
              size: compressed.bytes,
              saved: false,
            },
          ]);
          toast.success(
            `Foto "${file.name}" comprimida (${Math.round(compressed.bytes / 1024)} KB) y guardada`
          );
        }
      } catch (error) {
        console.error('Error comprimiendo/guardando fotos:', error);
        toast.error(error instanceof Error ? error.message : 'No se pudo guardar la foto.');
      } finally {
        setUploading(false);
      }
    },
    [disabled, maxSizeMB, onPhotoUploaded]
  );

  const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone({
    onDrop,
    accept: { 'image/*': ['.png', '.jpg', '.jpeg', '.webp'] },
    maxFiles: remainingSlots,
    maxSize: maxSizeMB * 1024 * 1024,
    disabled: disabled || remainingSlots === 0,
  });

  return (
    <div className="space-y-4">
      <div
        {...getRootProps()}
        className={`relative cursor-pointer rounded-xl border-2 border-dashed p-8 text-center transition ${
          isDragActive ? 'border-blue-500 bg-blue-50' : 'border-slate-300 hover:border-slate-400'
        } ${isDragReject ? 'border-red-500 bg-red-50' : ''} ${
          disabled ? 'cursor-not-allowed opacity-50' : ''
        } ${uploading ? 'pointer-events-none' : ''}`}
      >
        <input {...getInputProps()} />
        <div className="flex flex-col items-center gap-3">
          {uploading ? (
            <>
              <div className="h-12 w-12 animate-spin rounded-full border-4 border-slate-300 border-t-blue-500" />
              <p className="text-sm text-slate-600">Comprimiendo y guardando fotos...</p>
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
                  PNG, JPG, WEBP (máx. {maxSizeMB}MB, {maxFiles} fotos en el proyecto). Se
                  comprimen automáticamente antes de guardarse.
                </p>
              </div>
            </>
          )}
        </div>
      </div>

      {displayedFiles.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-slate-700">
            Fotos del proyecto ({displayedFiles.length})
          </p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
            {displayedFiles.map((file) => (
              <div key={file.id} className="group relative">
                <div className="aspect-square overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
                  <img
                    src={file.url}
                    alt={file.filename}
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className="absolute bottom-0 left-0 right-0 rounded-b-lg bg-black/60 p-1.5 text-xs text-white">
                  <p className="truncate">{file.filename}</p>
                  <p className="text-[10px] opacity-80">
                    {Math.round(file.size / 1024)} KB · {file.saved ? 'guardada' : 'procesando'}
                  </p>
                </div>
                {file.saved && onPhotoDelete && (
                  <button
                    type="button"
                    aria-label={`Eliminar foto ${file.filename}`}
                    disabled={deleting === file.id}
                    onClick={() => void handleDelete(file.id)}
                    className="absolute right-1 top-1 rounded-md bg-red-600/90 p-1 text-white opacity-0 transition group-hover:opacity-100 disabled:opacity-50"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex items-start gap-2 rounded-lg border border-blue-200 bg-blue-50 p-3">
        <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-blue-600" />
        <div className="text-xs text-blue-800">
          <p className="font-medium">
            Las fotos se redimensionan, se comprimen y se almacenan como datos en Firestore
          </p>
          <p className="mt-1">
            No se usa Firebase Storage: el proyecto{' '}
            <code className="rounded bg-blue-100 px-1">{projectCode}</code> guarda cada foto dentro
            de su documento, con acceso restringido a la empresa.
          </p>
        </div>
      </div>
    </div>
  );
}
