import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CloseCircle, Add } from 'iconsax-reactjs';

interface CreateBoardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (title: string, backgroundColor: string) => void;
  isPending: boolean;
}

const PRESET_COLORS = [
  { name: 'Purple', value: '#b39ddb' },
  { name: 'Blue', value: '#81d4fa' },
  { name: 'Teal', value: '#80cbc4' },
  { name: 'Green', value: '#a5d6a7' },
  { name: 'Orange', value: '#ffcc80' },
  { name: 'Pink', value: '#f48fb1' },
  { name: 'Indigo', value: '#9fa8da' },
  { name: 'Cyan', value: '#80deea' },
  { name: 'Lime', value: '#e6ee9c' },
  { name: 'Red', value: '#ef9a9a' },
];

export function CreateBoardModal({ isOpen, onClose, onSubmit, isPending }: CreateBoardModalProps) {
  const [title, setTitle] = useState('');
  const [selectedColor, setSelectedColor] = useState(PRESET_COLORS[0].value);

  useEffect(() => {
    if (isOpen) {
      setTitle('');
      setSelectedColor(PRESET_COLORS[0].value);
    }
  }, [isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (title.trim()) {
      onSubmit(title.trim(), selectedColor);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-[120] flex items-center justify-center bg-black/45 p-4 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.96 }}
          transition={{ type: 'spring', bounce: 0.15, duration: 0.4 }}
          className="madaar-surface relative w-full max-w-md overflow-hidden rounded-[28px] border border-base-content/10 bg-base-100/95 shadow-madaar-floating backdrop-blur-xl"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="max-h-[calc(100vh-2rem)] overflow-y-auto">
            {/* Header */}
            <header className="flex items-start justify-between gap-4 border-b border-base-content/10 bg-base-200/20 px-6 py-5">
              <div className="min-w-0 flex-1">
                <p className="mb-2 text-xs font-bold uppercase tracking-[0.16em] text-primary">
                  Board Setup
                </p>
                <h2 className="text-2xl font-semibold tracking-tight text-base-content">
                  Create a new board
                </h2>
                <p className="mt-1.5 text-sm leading-relaxed text-base-content/60">
                  Boards help organize tasks into different workflows.
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                disabled={isPending}
                className="btn btn-ghost btn-square btn-sm shrink-0 rounded-xl text-base-content/50 transition hover:bg-base-200 hover:text-base-content"
                aria-label="Close board form"
              >
                <CloseCircle size={20} />
              </button>
            </header>

            {/* Form */}
            <form className="space-y-6 p-6" onSubmit={handleSubmit}>
              {/* Board Title */}
              <div className="space-y-2">
                <label htmlFor="board-title" className="block text-sm font-medium text-base-content">
                  Board title <span className="text-error">*</span>
                </label>
                <input
                  id="board-title"
                  type="text"
                  required
                  autoFocus
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="input input-bordered w-full rounded-xl bg-base-200/50 transition-colors focus:border-primary focus:bg-base-100 focus:outline-none"
                  placeholder="e.g. Backend, Frontend, Design"
                  disabled={isPending}
                />
              </div>

              {/* Color Picker */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-base-content">
                  Board color
                </label>
                <div className="grid grid-cols-5 gap-2">
                  {PRESET_COLORS.map((color) => (
                    <button
                      key={color.value}
                      type="button"
                      onClick={() => setSelectedColor(color.value)}
                      disabled={isPending}
                      className={`group relative h-10 rounded-xl transition-all ${
                        selectedColor === color.value
                          ? 'ring-2 ring-primary ring-offset-2 ring-offset-base-100 scale-105'
                          : 'hover:scale-105'
                      }`}
                      style={{ backgroundColor: color.value }}
                      title={color.name}
                    >
                      {selectedColor === color.value && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="absolute inset-0 flex items-center justify-center"
                        >
                          <svg
                            width="16"
                            height="16"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="white"
                            strokeWidth="3"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        </motion.div>
                      )}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-base-content/45">
                  Choose a color to identify this board easily.
                </p>
              </div>

              {/* Actions */}
              <div className="flex flex-col-reverse gap-3 border-t border-base-content/10 pt-6 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isPending}
                  className="btn btn-ghost rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending || !title.trim()}
                  className="btn btn-primary rounded-xl px-6 shadow-lg shadow-primary/15 disabled:opacity-50"
                >
                  {isPending ? (
                    <>
                      <span className="loading loading-spinner loading-sm" />
                      <span>Creating...</span>
                    </>
                  ) : (
                    <>
                      <Add size={16} />
                      <span>Create board</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
