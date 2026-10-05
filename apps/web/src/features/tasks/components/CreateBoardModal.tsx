import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CloseSquare, Add, TickCircle, TaskSquare } from 'iconsax-reactjs';
import { useTranslation } from '../../../i18n/locale';
import { projectPalette } from '../../../core/config/designTokens';
import { BrandBeats } from '../../../components/Brand';

export interface CreateBoardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (title: string, backgroundColor: string) => void;
  isPending: boolean;
  initialData?: { title: string; backgroundColor?: string } | null;
  mode?: 'create' | 'edit';
}

const PRESET_COLORS = projectPalette;

const QUICK_SUGGESTIONS = [
  'توسعه فرانت‌اند',
  'سرویس‌های بک‌اند',
  'طراحی محصول',
  'اسپرینت جاری',
];

export function CreateBoardModal({
  isOpen,
  onClose,
  onSubmit,
  isPending,
  initialData,
  mode = 'create',
}: CreateBoardModalProps) {
  const t = useTranslation();
  const isEdit = mode === 'edit';

  const [title, setTitle] = useState(initialData?.title || '');
  const [selectedColor, setSelectedColor] = useState<string>(
    initialData?.backgroundColor || PRESET_COLORS[0].value
  );

  useEffect(() => {
    if (isOpen) {
      setTitle(initialData?.title || '');
      setSelectedColor(initialData?.backgroundColor || PRESET_COLORS[0].value);
    }
  }, [isOpen, initialData]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (title.trim()) {
      onSubmit(title.trim(), selectedColor);
    }
  };

  const currentColorName =
    PRESET_COLORS.find((c) => c.value === selectedColor)?.name || t('فیروزه‌ای');

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-[120] flex items-center justify-center bg-[#173C46]/50 p-4 backdrop-blur-md transition-opacity"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, y: 24, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 16, scale: 0.96 }}
          transition={{ type: 'spring', bounce: 0.12, duration: 0.38 }}
          className="relative w-full max-w-lg overflow-hidden rounded-[32px] border border-[#DCE6E2] bg-base-100 shadow-[0_28px_90px_rgba(23,60,70,0.24)] text-start"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="max-h-[calc(100dvh-2rem)] overflow-y-auto">
            {/* ─── Hero Header with Heledone Coastal Art & Brand Beats ─── */}
            <div className="relative overflow-hidden border-b border-[#DCE6E2]/80 bg-gradient-to-b from-[#FFF8EE] to-base-100 px-7 pt-6 pb-5">
              {/* Panoramic coastal art overlay */}
              <img
                src="/images/heledone-assets/tasks-coastal-v1.png"
                alt=""
                aria-hidden="true"
                className="coastal-dialog-header-art pointer-events-none absolute inset-0 h-full w-full object-cover object-center opacity-25 mix-blend-multiply"
              />
              <div
                className="pointer-events-none absolute inset-0 bg-gradient-to-t from-base-100 via-base-100/60 to-transparent"
                aria-hidden="true"
              />

              {/* Decorative boat lenj watermark */}
              <img
                src="/images/heledone-assets/boat-lenj.png"
                alt=""
                aria-hidden="true"
                className="pointer-events-none absolute -bottom-2 -end-3 h-24 w-auto object-contain opacity-25 select-none"
              />

              <div className="relative z-10">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-2.5">
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-bold text-primary backdrop-blur-xs">
                      <BrandBeats className="inline-flex scale-75" />
                      <span>{t('هله‌دان · تخته‌های جریان کار')}</span>
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={onClose}
                    disabled={isPending}
                    className="grid size-9 place-items-center rounded-2xl border border-base-content/10 bg-base-100/80 text-heledone-ink-muted backdrop-blur-xs transition hover:bg-base-200 hover:text-base-content hover:scale-105 active:scale-95"
                    aria-label={t('بستن')}
                  >
                    <CloseSquare size={20} />
                  </button>
                </div>

                <div className="mt-4">
                  <h2 className="text-2xl font-black tracking-tight text-base-content">
                    {isEdit ? t('ویرایش تخته کانبان') : t('ساخت کانبان جدید')}
                  </h2>
                  <p className="mt-1.5 text-xs leading-relaxed text-heledone-ink-muted">
                    {isEdit
                      ? t('مشخصات و رنگ زمینه این تخته کار را ویرایش کنید.')
                      : t('فضایی هماهنگ با ریتم تیم، برای به حرکت درآوردن ایده‌ها تا سرانجام.')}
                  </p>
                </div>
              </div>
            </div>

            {/* ─── Modal Form ─── */}
            <form className="space-y-6 p-7" onSubmit={handleSubmit}>
              {/* ─── Live Mini Kanban Preview Card ─── */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-heledone-ink-muted">
                  <span>{t('پیش‌نمایش زنده تخته')}</span>
                  <span className="flex items-center gap-1.5 text-[11px] font-semibold text-primary">
                    <span
                      className="size-2 rounded-full transition-colors duration-300"
                      style={{ backgroundColor: selectedColor }}
                    />
                    {currentColorName}
                  </span>
                </div>

                <div
                  className="relative overflow-hidden rounded-2xl border border-base-content/10 p-3.5 transition-all duration-300"
                  style={{
                    backgroundColor: `color-mix(in srgb, ${selectedColor} 12%, var(--color-heledone-surface))`,
                  }}
                >
                  <div className="flex items-center justify-between border-b border-base-content/8 pb-2.5">
                    <div className="flex items-center gap-2">
                      <span
                        className="size-3.5 rounded-md shadow-xs transition-colors duration-300"
                        style={{ backgroundColor: selectedColor }}
                      />
                      <span className="text-xs font-black text-base-content truncate max-w-[220px]">
                        {title.trim() || t('عنوان تخته کانبان شما…')}
                      </span>
                    </div>
                    <span className="rounded-md bg-base-100/90 px-2 py-0.5 text-[10px] font-bold text-heledone-ink-muted shadow-2xs">
                      {t('کانبان فعال')}
                    </span>
                  </div>

                  {/* 3 Miniature Kanban Columns */}
                  <div className="mt-2.5 grid grid-cols-3 gap-2">
                    <div className="rounded-xl border border-base-content/6 bg-base-100/75 p-2 backdrop-blur-2xs shadow-2xs">
                      <div className="mb-1.5 flex items-center justify-between text-[10px] font-bold text-heledone-ink-muted">
                        <span>{t('برای انجام')}</span>
                        <span className="text-[9px]">۲</span>
                      </div>
                      <div className="space-y-1">
                        <div className="h-4 rounded-md bg-base-200/80" />
                        <div className="h-4 rounded-md bg-base-200/50" />
                      </div>
                    </div>

                    <div className="rounded-xl border border-primary/20 bg-base-100/90 p-2 shadow-2xs">
                      <div className="mb-1.5 flex items-center justify-between text-[10px] font-bold text-primary">
                        <span>{t('در حال انجام')}</span>
                        <span className="size-1.5 rounded-full bg-primary" />
                      </div>
                      <div
                        className="h-7 rounded-md p-1 border-s-2"
                        style={{
                          borderColor: selectedColor,
                          backgroundColor: `color-mix(in srgb, ${selectedColor} 15%, transparent)`,
                        }}
                      >
                        <div className="h-1.5 w-3/4 rounded-xs bg-base-content/25" />
                      </div>
                    </div>

                    <div className="rounded-xl border border-base-content/6 bg-base-100/75 p-2 backdrop-blur-2xs shadow-2xs">
                      <div className="mb-1.5 flex items-center justify-between text-[10px] font-bold text-success">
                        <span>{t('انجام‌شده')}</span>
                        <span className="text-[9px]">✓</span>
                      </div>
                      <div className="h-4 rounded-md bg-success/15" />
                    </div>
                  </div>
                </div>
              </div>

              {/* ─── Board Title Input & Quick Suggestions ─── */}
              <div className="space-y-2">
                <label
                  htmlFor="board-title"
                  className="flex items-center justify-between text-xs font-bold text-base-content"
                >
                  <span className="flex items-center gap-1.5">
                    <TaskSquare size={15} className="text-primary" />
                    {t('Board title')}
                    <span className="text-error">*</span>
                  </span>
                </label>

                <input
                  id="board-title"
                  type="text"
                  required
                  autoFocus
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full rounded-2xl border border-base-content/15 bg-base-200/40 px-4 py-3 text-sm font-semibold text-base-content outline-none transition focus:border-primary focus:bg-base-100 focus:ring-3 focus:ring-primary/15"
                  placeholder={t('مثلاً: توسعه وب، طراحی محصول، اسپرینت بهار…')}
                  disabled={isPending}
                />

                {/* Quick suggestions pills */}
                {!isEdit && (
                  <div className="pt-1">
                    <div className="mb-1.5 text-[11px] font-semibold text-heledone-ink-muted">
                      {t('پیشنهادهای سریع')}:
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {QUICK_SUGGESTIONS.map((suggestion) => (
                        <button
                          key={suggestion}
                          type="button"
                          onClick={() => setTitle(suggestion)}
                          className="rounded-lg border border-base-content/10 bg-base-200/50 px-2.5 py-1 text-[11px] font-medium text-heledone-ink-muted transition hover:border-primary/40 hover:bg-primary/5 hover:text-primary active:scale-95"
                        >
                          {t(suggestion)}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* ─── Heledone Southern Coastal Color Palette ─── */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-base-content">
                    {t('رنگ هویت تخته')}
                  </label>
                  <span className="text-xs text-heledone-ink-muted">
                    {t('تمایز دیداری در جابجایی بین تخته‌ها')}
                  </span>
                </div>

                <div className="grid grid-cols-5 gap-2.5 sm:grid-cols-10">
                  {PRESET_COLORS.map((color) => {
                    const isSelected = selectedColor === color.value;
                    return (
                      <button
                        key={color.value}
                        type="button"
                        onClick={() => setSelectedColor(color.value)}
                        disabled={isPending}
                        className={`group relative flex h-10 w-full items-center justify-center rounded-2xl transition-all duration-200 ${
                          isSelected
                            ? 'scale-110 ring-2 ring-primary ring-offset-2 ring-offset-base-100 shadow-md'
                            : 'hover:scale-105 opacity-85 hover:opacity-100'
                        }`}
                        style={{ backgroundColor: color.value }}
                        title={color.name}
                        aria-label={color.name}
                      >
                        {isSelected && (
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ type: 'spring', bounce: 0.3 }}
                            className="drop-shadow-xs"
                          >
                            <TickCircle size={16} variant="Bold" className="text-white" />
                          </motion.div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* ─── Actions Footer ─── */}
              <div className="flex flex-col-reverse gap-3 border-t border-base-content/10 pt-5 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isPending}
                  className="rounded-2xl px-5 py-2.5 text-xs font-bold text-heledone-ink-muted transition hover:bg-base-200 hover:text-base-content active:scale-98"
                >
                  {t('انصراف')}
                </button>

                <button
                  type="submit"
                  disabled={isPending || !title.trim()}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-primary to-[#006D73] px-6 py-2.5 text-xs font-bold text-primary-content shadow-lg shadow-primary/20 transition hover:from-[#006D73] hover:to-[#005B60] active:scale-98 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isPending ? (
                    <>
                      <span className="loading loading-spinner loading-xs" />
                      <span>{t('Creating...')}</span>
                    </>
                  ) : (
                    <>
                      {isEdit ? <TickCircle size={16} /> : <Add size={16} />}
                      <span>{isEdit ? t('ذخیره تغییرات') : t('ساخت تخته کانبان')}</span>
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
