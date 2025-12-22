"use client";

import { useState, useCallback, useRef } from "react";
import { Upload, X, GripVertical, Image as ImageIcon, Loader2 } from "lucide-react";
import NextImage from "next/image";

interface ImageFile {
  id: string;
  url: string;
  alt?: string;
  sortOrder: number;
}

interface ImageUploadDragDropProps {
  images: ImageFile[];
  onChange: (images: ImageFile[]) => void;
  maxImages?: number;
}

export default function ImageUploadDragDrop({ 
  images, 
  onChange, 
  maxImages = 20 
}: ImageUploadDragDropProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle file upload to Cloudinary
  const uploadToCloudinary = async (file: File): Promise<string> => {
    try {
      // Get signature
      const sigRes = await fetch("/api/upload/cloudinary-sign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ folder: "zillowlike" }),
      });
      const sig = await sigRes.json();

      // Upload
      const fd = new FormData();
      fd.append("file", file);
      fd.append("api_key", sig.apiKey);
      fd.append("timestamp", String(sig.timestamp));
      fd.append("signature", sig.signature);
      fd.append("folder", sig.folder);

      const uploadRes = await fetch(
        `https://api.cloudinary.com/v1_1/${sig.cloudName}/image/upload`,
        { method: "POST", body: fd }
      );
      const data = await uploadRes.json();

      if (!data.secure_url) throw new Error("Upload failed");
      return data.secure_url;
    } catch (error) {
      console.error("Upload error:", error);
      throw error;
    }
  };

  // Image processing: downscale to 2560px max side and convert to WebP ~0.82
  const processImage = async (file: File): Promise<File> => {
    const MAX_SIDE = 2560;
    // Create bitmap
    const url = URL.createObjectURL(file);
    try {
      const img = await new Promise<HTMLImageElement>((resolve, reject) => {
        const el = document.createElement('img');
        el.onload = () => resolve(el);
        el.onerror = reject;
        el.src = url;
      });
      const { naturalWidth: w, naturalHeight: h } = img;
      if (!w || !h) return file;
      const scale = Math.min(1, MAX_SIDE / Math.max(w, h));
      if (scale === 1 && file.type === 'image/webp') return file;
      const targetW = Math.round(w * scale);
      const targetH = Math.round(h * scale);
      const canvas = document.createElement('canvas');
      canvas.width = targetW;
      canvas.height = targetH;
      const ctx = canvas.getContext('2d');
      if (!ctx) return file;
      ctx.drawImage(img, 0, 0, targetW, targetH);
      const blob: Blob = await new Promise((resolve) => canvas.toBlob(b => resolve(b as Blob), 'image/webp', 0.82));
      return new File([blob], file.name.replace(/\.[^.]+$/, '.webp'), { type: 'image/webp' });
    } finally {
      URL.revokeObjectURL(url);
    }
  };

  // Handle files
  const handleFiles = async (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    const imageFiles = fileArray.filter(file => file.type.startsWith("image/"));

    if (imageFiles.length === 0) return;
    if (images.length + imageFiles.length > maxImages) {
      alert(`Máximo de ${maxImages} imagens permitidas`);
      return;
    }

    const MAX_MB = 6;

    setUploading(true);

    try {
      const uploadPromises = imageFiles.map(async (file) => {
        // Reject extremely large files before processing for UX
        const sizeMB = file.size / (1024 * 1024);
        let candidate = file;
        if (sizeMB > MAX_MB || true) {
          try {
            candidate = await processImage(file);
          } catch (err: any) {
            alert(err?.message || 'Não foi possível otimizar a imagem. Vamos enviar mesmo assim.');
            candidate = file;
          }
        }
        return uploadToCloudinary(candidate);
      });
      const urls = await Promise.all(uploadPromises);

      const newImages: ImageFile[] = urls.map((url, index) => ({
        id: `${Date.now()}-${index}`,
        url,
        sortOrder: images.length + index,
      }));

      onChange([...images, ...newImages]);
    } catch (error) {
      alert("Erro ao fazer upload das imagens");
    } finally {
      setUploading(false);
    }
  };

  // Drag & Drop handlers
  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.currentTarget === e.target) {
      setIsDragging(false);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    handleFiles(files);
  }, [images.length]);

  // Reorder images (Drag & Drop)
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  const handleImageDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleImageDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    setDragOverIndex(index);
  };

  const handleImageDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === dropIndex) {
      setDraggedIndex(null);
      setDragOverIndex(null);
      return;
    }

    const newImages = [...images];
    const [draggedImage] = newImages.splice(draggedIndex, 1);
    newImages.splice(dropIndex, 0, draggedImage);

    // Update sort order
    const reorderedImages = newImages.map((img, idx) => ({
      ...img,
      sortOrder: idx,
    }));

    onChange(reorderedImages);
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const removeImage = (id: string) => {
    const filtered = images.filter(img => img.id !== id);
    const reordered = filtered.map((img, idx) => ({ ...img, sortOrder: idx }));
    onChange(reordered);
  };

  const updateImageAlt = (id: string, alt: string) => {
    const updated = images.map(img => 
      img.id === id ? { ...img, alt } : img
    );
    onChange(updated);
  };

  return (
    <div className="space-y-4">
      {/* Upload Zone */}
      <div
        className={`relative border-2 border-dashed rounded-2xl p-8 transition-all duration-200 ${
          isDragging
            ? "border-blue-500 bg-blue-50 scale-[1.02]"
            : "border-gray-300 hover:border-blue-400 hover:bg-gray-50"
        } ${uploading ? "opacity-50 pointer-events-none" : ""}`}
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => e.target.files && handleFiles(e.target.files)}
        />

        <div className="text-center">
          {uploading ? (
            <>
              <Loader2 className="w-12 h-12 text-blue-600 mx-auto mb-4 animate-spin" />
              <p className="text-gray-700 font-medium">Enviando imagens...</p>
            </>
          ) : (
            <>
              <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-700 font-medium mb-2">
                Arraste e solte as imagens aqui
              </p>
              <p className="text-gray-500 text-sm mb-4">
                ou clique para selecionar
              </p>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-6 py-2.5 glass-teal text-white font-medium rounded-lg transition-colors"
              >
                Selecionar Imagens
              </button>
              <p className="text-gray-400 text-xs mt-3">
                Máximo {maxImages} imagens • PNG, JPG, WEBP
              </p>
            </>
          )}
        </div>
      </div>

      {/* Images Grid */}
      {images.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium text-gray-700">
              {images.length} imagem{images.length !== 1 ? "s" : ""} • Arraste para reordenar
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {images.map((image, index) => (
              <div
                key={image.id}
                draggable
                onDragStart={() => handleImageDragStart(index)}
                onDragOver={(e) => handleImageDragOver(e, index)}
                onDrop={(e) => handleImageDrop(e, index)}
                onDragEnd={() => {
                  setDraggedIndex(null);
                  setDragOverIndex(null);
                }}
                className={`group relative aspect-square bg-gray-100 rounded-lg overflow-hidden cursor-move transition-all ${
                  draggedIndex === index ? "opacity-50 scale-95" : ""
                } ${
                  dragOverIndex === index && draggedIndex !== index
                    ? "ring-2 ring-blue-500"
                    : ""
                }`}
              >
                {/* Image */}
                <NextImage
                  src={image.url}
                  alt={image.alt || ""}
                  fill
                  className="object-cover"
                />

                {/* Order Badge */}
                <div className="absolute top-2 left-2 flex items-center gap-1 px-2 py-1 bg-black/70 text-white text-xs font-bold rounded">
                  <GripVertical className="w-3 h-3" />
                  {index + 1}
                </div>

                {/* Remove Button */}
                <button
                  type="button"
                  onClick={() => removeImage(image.id)}
                  className="absolute top-2 right-2 p-1.5 bg-red-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-700"
                >
                  <X className="w-4 h-4" />
                </button>

                {/* Alt Text Input */}
                <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                  <input
                    type="text"
                    placeholder="Descrição..."
                    value={image.alt || ""}
                    onChange={(e) => updateImageAlt(image.id, e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                    className="w-full px-2 py-1 bg-white/90 text-xs rounded border-0 focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {images.length === 0 && !uploading && (
        <div className="text-center py-8 bg-gray-50 rounded-lg border border-gray-200">
          <ImageIcon className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">
            Nenhuma imagem adicionada ainda
          </p>
        </div>
      )}
    </div>
  );
}
