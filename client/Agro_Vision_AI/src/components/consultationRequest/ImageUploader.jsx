import { useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Upload, X, ImageIcon } from "lucide-react";

export default function ImageUploader({ images, onAdd, onRemove }) {
  const inputRef = useRef();

  const handleFiles = (e) => {
    const files = Array.from(e.target.files);
    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = (ev) => onAdd({ file, preview: ev.target.result, name: file.name });
      reader.readAsDataURL(file);
    });
    e.target.value = "";
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith("image/"));
    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = (ev) => onAdd({ file, preview: ev.target.result, name: file.name });
      reader.readAsDataURL(file);
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white border border-slate-200 shadow-sm rounded-2xl p-6 space-y-4"
    >
      <div className="flex items-center gap-3 mb-2">
        <div className="w-9 h-9 rounded-xl bg-blue-100 flex items-center justify-center">
          <ImageIcon size={18} className="text-blue-600" />
        </div>
        <div>
          <h2 className="text-slate-900 font-semibold text-lg">Upload Crop Images</h2>
          <p className="text-slate-500 text-xs">AI will analyze your images for disease detection</p>
        </div>
      </div>

      {/* Drop zone */}
      <div
        onDrop={handleDrop}
        onDragOver={e => e.preventDefault()}
        onClick={() => inputRef.current?.click()}
        className="border-2 border-dashed border-slate-200 rounded-xl p-8 text-center cursor-pointer hover:border-green-400/50 hover:bg-slate-50 transition-all"
      >
        <Upload size={28} className="text-slate-400 mx-auto mb-3" />
        <p className="text-slate-500 text-sm">Drag & drop images or <span className="text-green-400 underline">browse</span></p>
        <p className="text-slate-400 text-xs mt-1">PNG, JPG, WEBP up to 10MB each</p>
        <input ref={inputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleFiles} />
      </div>

      {/* Previews */}
      <AnimatePresence>
        {images.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="grid grid-cols-3 sm:grid-cols-4 gap-3"
          >
            {images.map((img, i) => (
              <motion.div
                key={i}
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
                className="relative group rounded-xl overflow-hidden aspect-square"
              >
                <img src={img.preview} alt={img.name} className="w-full h-full object-cover" loading="lazy" />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <button
                    onClick={(e) => { e.stopPropagation(); onRemove(i); }}
                    className="w-7 h-7 rounded-full bg-red-500 flex items-center justify-center"
                  >
                    <X size={13} className="text-slate-900" />
                  </button>
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
