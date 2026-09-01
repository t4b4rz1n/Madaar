import { useEffect } from "react";
import { AnimatePresence, motion } from "motion/react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Add, Edit, CloseCircle } from "iconsax-reactjs";
import { createPortal } from "react-dom";
import { useCreateTeam, useUpdateTeam } from "../hooks/useTeams";
import { TeamForm } from "./TeamForm";
import type { TeamWithDetails } from "../types";
import * as z from "zod";

const backdropVariants = { hidden: { opacity: 0 }, visible: { opacity: 1 } };
const modalVariants = {
  hidden: { opacity: 0, y: 30, scale: 0.98 },
  visible: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, y: 30, scale: 0.98 },
};

const teamSchema = z.object({
  name: z.string().min(3, "Team name must be at least 3 characters"),
  description: z.string().optional(),
  lead_id: z.string().nullable().optional(),
  is_active: z.boolean().default(true),
});

interface CreateEditTeamModalProps {
  isOpen: boolean;
  onClose: () => void;
  team?: TeamWithDetails | null;
  organizationId: string;
}

export const CreateEditTeamModal = ({
  isOpen,
  onClose,
  team,
  organizationId,
}: CreateEditTeamModalProps) => {
  const isEditMode = !!team;

  // استفاده از هوک‌های مجزا به جای useTeams
  const createTeam = useCreateTeam();
  const updateTeam = useUpdateTeam();

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(teamSchema),
    defaultValues: {
      name: "",
      description: "",
      lead_id: null, // اضافه شد
      is_active: true,
    },
  });

  useEffect(() => {
    if (!isOpen) return;
    if (team) {
      reset({
        name: team.name,
        description: team.description || "",
        lead_id: team.lead_id, // اضافه شد
        is_active: !!team.is_active,
      });
    } else {
      reset({ name: "", description: "", lead_id: null, is_active: true });
    }
  }, [isOpen, team, reset]);

  const onSubmit = handleSubmit(async (data) => {
    try {
      if (isEditMode && team) {
        await updateTeam.mutateAsync({ id: team.id, data });
      } else {
        await createTeam.mutateAsync({ ...data, organization: organizationId });
      }
      onClose();
    } catch {
      // توستر خطا قبلاً در ساختار هوک پیاده‌سازی شده است
    }
  });

  const isLoading = createTeam.isPending || updateTeam.isPending;

  const modalContent = (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          variants={backdropVariants}
          initial="hidden"
          animate="visible"
          exit="hidden"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={onClose}
        >
          <motion.div
            variants={modalVariants}
            className="relative w-full max-w-lg bg-base-100 rounded-2xl shadow-xl m-4 max-h-[90vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 flex-shrink-0 border-b border-base-content/10">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-primary/10 text-primary rounded-xl">
                    {isEditMode ? <Edit size={28} /> : <Add size={28} />}
                  </div>
                  <div>
                    <h3 className="font-bold text-2xl text-base-content">
                      {isEditMode ? "Edit Team" : "Create New Team"}
                    </h3>
                    <p className="text-base-content/70 text-sm">
                      {isEditMode
                        ? "Update team details"
                        : "Add a new team to Madaar"}
                    </p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-base-content/10 rounded-lg transition-colors"
                >
                  <CloseCircle className="w-6 h-6 text-base-content/60" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-6 pt-6">
              <form id="team-form" onSubmit={onSubmit}>
                <TeamForm control={control} errors={errors} organizationId={organizationId} />
              </form>
            </div>

            <div className="p-6 flex-shrink-0 border-t border-base-content/10 bg-base-200/30 rounded-b-2xl text-right">
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="btn btn-ghost rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  form="team-form"
                  disabled={isLoading}
                  className="btn btn-primary rounded-xl px-6"
                >
                  {isLoading ? (
                    <span className="loading loading-spinner loading-sm"></span>
                  ) : isEditMode ? (
                    "Update Team"
                  ) : (
                    "Create Team"
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  return typeof document !== "undefined"
    ? createPortal(modalContent, document.body)
    : null;
};
