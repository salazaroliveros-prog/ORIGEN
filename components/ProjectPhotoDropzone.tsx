'use client';

import Image from 'next/image';
import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, X, Image as ImageIcon, Check, AlertCircle } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface ProjectPhotoDropzoneProps {
  projectId: string;
  projectCode: string;
  onPhotoUploaded: (
    photoUrl: string,
    metadata: {
      filename: string;
      uploadedAt: string;
      size: number;
    }
  ) => void;
  maxFiles?: number;
  maxSizeMB?: number;
  disabled?: boolean;
}

export function ProjectPhotoDropzone({
  projectId,
  projectCode,
  onPhotoUploaded,
  maxFiles = 5,
  maxSizeMB = 10,
  disabled = false,
}: ProjectPhotoDropzoneProps) {
  const [uploading, setUploading] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<
    Array<{
      url: string;
      filename: string;
      uploadedAt: string;
      size: number;
    }>
  >([]);

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

          // Subir a Firebase Storage
          const formData = new FormData();
          formData.append('file', file);
          formData.append('projectId', projectId);
          formData.append('projectCode', projectCode);

          const response = await fetch('/api/upload-project-photo', {
            method: 'POST',
            body: formData,
          });

          if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Error al subir la foto');
          }

          const data = await response.json();

          const photoData = {
            url: data.url,
            filename: file.name,
            uploadedAt: new Date().toISOString(),
            size: file.size,
          };

          setUploadedFiles((prev) => [...prev, photoData]);
          onPhotoUploaded(data.url, photoData);
          toast.success(`Foto "${file.name}" subida correctamente`);
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
    maxFiles,
    maxSize: maxSizeMB * 1024 * 1024,
    disabled,
  });

  const removePhoto = (index: number) => {
    setUploadedFiles((prev) => {
      const newFiles = [...prev];
      const removed = newFiles.splice(index, 1)[0];
      // Notificar al componente padre que se eliminó una foto
      toast.success(`Foto "${removed.filename}" eliminada`);
      return newFiles;
    });
  };

  return (
    <div className="space-y-4">
      {/* Dropzone */}
      <div
        {...getRootProps()}
        className={`relative cursor-pointer rounded-xl border-2 border-dashed p-8 text-center transition-all ${isDragActive ? 'border-blue-500 bg-blue-50' : 'border-slate-300 hover:border-slate-400'} ${isDragReject ? 'border-red-500 bg-red-50' : ''} ${disabled ? 'cursor-not-allowed opacity-50' : ''} ${uploading ? 'pointer-events-none' : ''} `}
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
                  PNG, JPG, WEBP (máx. {maxSizeMB}MB, {maxFiles} archivos)
                </p>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Lista de fotos subidas */}
      {uploadedFiles.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-slate-700">
            Fotos subidas ({uploadedFiles.length})
          </p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
            {uploadedFiles.map((file, index) => (
              <div key={index} className="group relative">
                <div className="aspect-square overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
                  <Image
          src={file.url}
          alt={file.filename}
          className="h-full w-full object-cover"
          width={800}
          quality={80}
        />
                </div>
                <button
                  onClick={() => removePhoto(index)}
                  className="absolute -top-2 -right-2 rounded-full bg-red-500 p-1.5 text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100"
                  title="Eliminar foto"
                >
                  <X className="h-4 w-4" />
                </button>
                <div className="absolute right-0 bottom-0 left-0 rounded-b-lg bg-black/60 p-1.5 text-xs text-white">
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
          <p className="font-medium">Las fotos se almacenan en Firebase Storage</p>
          <p className="mt-1">
            Se guardarán en la carpeta{' '}
            <code className="rounded bg-blue-100 px-1">/projects/{projectCode}/progress</code>
          </p>
        </div>
      </div>
    </div>
  );
}
