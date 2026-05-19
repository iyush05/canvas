"use client";

import { useState, useRef } from "react";
import { useCanvasStore } from "@/stores/canvasStore";
import { createImageElement } from "@/lib/canvas/elements";
import type { ElementStyle } from "@/types/canvas";
import { Image as ImageIcon, X, UploadCloud } from "lucide-react";

export default function ImageUploadModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const store = useCanvasStore;

  const handleUpload = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      alert("Please upload an image file");
      return;
    }

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) throw new Error("Upload failed");
      const { src } = await res.json();

      // Get natural dimensions
      const img = new Image();
      img.onload = () => {
        const state = store.getState();
        const el = createImageElement(
          src,
          img.naturalWidth,
          img.naturalHeight,
          state.viewport.offsetX * -1 / state.viewport.zoom + 100, // center somewhat
          state.viewport.offsetY * -1 / state.viewport.zoom + 100,
          state.getElementsArray().length + 1,
          { ...state.activeStyle } as ElementStyle
        );
        state.addElement(el);
        setIsOpen(false);
      };
      img.src = src;
    } catch (err) {
      console.error("Image upload failed:", err);
      alert("Failed to upload image");
    } finally {
      setIsUploading(false);
    }
  };

  const onDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleUpload(e.dataTransfer.files[0]);
    }
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        title="Upload Image"
        className="flex items-center justify-center w-10 h-10 rounded-full text-white/60 hover:text-white hover:bg-white/10 transition-all duration-150 ease-out select-none"
      >
        <ImageIcon size={20} />
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-md p-4">
          <div 
            className="w-full max-w-md rounded-3xl relative overflow-hidden"
            style={{
              background: "rgba(30, 30, 35, 0.4)",
              backdropFilter: "blur(60px) saturate(200%)",
              border: "1px solid rgba(255, 255, 255, 0.15)",
              boxShadow: "0 24px 64px rgba(0, 0, 0, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.2)",
            }}
          >
            
            <div className="flex items-center justify-between px-6 py-5 border-b border-white/10">
              <h2 className="text-lg font-medium text-white shadow-sm">Upload Image</h2>
              <button
                onClick={() => setIsOpen(false)}
                className="text-white/60 hover:text-white transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6">
              <div
                className={`border-2 border-dashed rounded-2xl p-8 text-center transition-all ${
                  dragActive
                    ? "border-white/40 bg-white/10"
                    : "border-white/20 bg-black/20 hover:bg-white/5 hover:border-white/30"
                }`}
                onDragEnter={onDrag}
                onDragLeave={onDrag}
                onDragOver={onDrag}
                onDrop={onDrop}
              >
                <input
                  ref={inputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files?.[0]) handleUpload(e.target.files[0]);
                  }}
                />
                
                {isUploading ? (
                  <div className="flex flex-col items-center py-4">
                    <div className="w-8 h-8 border-2 border-white/40 border-t-transparent rounded-full animate-spin mb-3" />
                    <p className="text-sm font-medium text-white/80">Uploading...</p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center">
                    <div className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center text-white/80 mb-4 border border-white/20 shadow-inner">
                      <UploadCloud size={24} />
                    </div>
                    <p className="text-white/90 font-medium mb-1">
                      Drag & drop an image
                    </p>
                    <p className="text-xs text-white/50 mb-6">
                      PNG, JPG, WEBP up to 5MB
                    </p>
                    <button
                      onClick={() => inputRef.current?.click()}
                      className="px-5 py-2.5 bg-white/20 hover:bg-white/30 text-white font-medium rounded-xl text-sm transition-colors border border-white/20 shadow-[0_2px_8px_rgba(0,0,0,0.2)]"
                    >
                      Browse Files
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
