import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { createPortal } from "react-dom";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Add,
  CloseCircle,
  Edit2,
  Trash,
  TickSquare,
  People,
  User,
} from "iconsax-reactjs";
import { useSquads, useCreateSquad, useUpdateSquad, useDeleteSquad } from "../hooks/useTeams";
import { ConfirmationModal } from "../../../components/ConfirmationModal";
import type { Team, Squad } from "../types";

const backdropVariants = { hidden: { opacity: 0 }, visible: { opacity: 1 } };
const modalVariants = {
  hidden: { opacity: 0, y: 30, scale: 0.98 },
  visible: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, y: 30, scale: 0.98 },
};

const squadSchema = z.object({
  name: z.string().min(2, "Squad name must be at least 2 characters"),
  description: z.string().optional(),
  is_active: z.boolean().default(true),
});

interface TeamSquadsModalProps {
  team: Team | null;
  isOpen: boolean;
  onClose: () => void;
  onManageMembers?: (team: Team) => void;
}

export const TeamSquadsModal = ({ team, isOpen, onClose, onManageMembers }: TeamSquadsModalProps) => {
  const { data: squads, isLoading, isError } = useSquads(team?.id);
  const createSquad = useCreateSquad();
  const updateSquad = useUpdateSquad();
  const deleteSquad = useDeleteSquad();

  const [editingSquadId, setEditingSquadId] = useState<number | null>(null);
  const [deletingSquadId, setDeletingSquadId] = useState<number | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(squadSchema),
    defaultValues: { name: "", description: "", is_active: true },
  });

  const {
    control: editControl,
    handleSubmit: handleEditSubmit,
    reset: resetEdit,
    formState: { errors: editErrors },
  } = useForm({
    resolver: zodResolver(squadSchema),
    defaultValues: { name: "", description: "", is_active: true },
  });

  // Reset form when modal opens/closes or team changes
  useEffect(() => {
    if (!isOpen) {
      setShowCreateForm(false);
      setEditingSquadId(null);
      setDeletingSquadId(null);
    }
  }, [isOpen]);

  const onCreateSubmit = handleSubmit(async (data) => {
    if (!team) return;
    try {
      await createSquad.mutateAsync({ team_id: team.id, ...data, is_active: data.is_active ?? true });
      setShowCreateForm(false);
      reset({ name: "", description: "", is_active: true });
    } catch {
      // toast handled by hook
    }
  });

  const onEditSubmit = handleEditSubmit(async (data) => {
    if (!editingSquadId) return;
    try {
      await updateSquad.mutateAsync({ id: editingSquadId, data });
      setEditingSquadId(null);
      resetEdit({ name: "", description: "", is_active: true });
    } catch {
      // toast handled by hook
    }
  });

  const handleDeleteConfirm = async () => {
    if (deletingSquadId === null) return;
    try {
      await deleteSquad.mutateAsync(deletingSquadId);
      setDeletingSquadId(null);
    } catch {
      // toast handled by hook
    }
  };

  const startEditing = (squad: Squad) => {
    setEditingSquadId(squad.id);
    resetEdit({
      name: squad.name,
      description: squad.description || "",
      is_active: squad.is_active,
    });
  };

  const cancelEditing = () => {
    setEditingSquadId(null);
    resetEdit({ name: "", description: "", is_active: true });
  };

  const isMutating = createSquad.isPending || updateSquad.isPending || deleteSquad.isPending;

  const modalContent = (
    <AnimatePresence>
      {isOpen && team && (
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
            className="relative w-full max-w-2xl bg-base-100 rounded-2xl shadow-xl m-4 max-h-[90vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="p-6 flex-shrink-0 border-b border-base-content/10">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-primary/10 text-primary rounded-xl">
                    <People size={28} />
                  </div>
                  <div>
                    <h3 className="font-bold text-2xl text-base-content">
                      Manage Squads
                    </h3>
                    <p className="text-base-content/70 text-sm">
                      Squads under <span className="font-semibold">{team.name}</span>
                    </p>
                  </div>
                </div>
                {onManageMembers && (
                  <button
                    type="button"
                    onClick={() => onManageMembers(team)}
                    className="btn btn-ghost btn-sm gap-1.5 rounded-xl text-base-content/60 hover:text-primary hover:bg-primary/10 motion-interactive"
                    title="Manage Members"
                  >
                    <User size={16} />
                    Members
                  </button>
                )}
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-base-content/10 rounded-lg transition-colors"
                >
                  <CloseCircle className="w-6 h-6 text-base-content/60" />
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {/* Loading State */}
              {isLoading && (
                <div className="space-y-3">
                  {[...Array(3)].map((_, i) => (
                    <div
                      key={i}
                      className="h-14 bg-base-content/5 rounded-xl animate-pulse"
                    />
                  ))}
                </div>
              )}

              {/* Error State */}
              {isError && !isLoading && (
                <div className="flex flex-col items-center justify-center min-h-[150px] text-center border border-dashed border-error/30 rounded-2xl p-6 bg-error/5">
                  <p className="text-error font-medium">Failed to load squads.</p>
                  <p className="text-xs text-base-content/60 mt-1">
                    Please check your connection and try again.
                  </p>
                </div>
              )}

              {/* Empty State */}
              {!isLoading && !isError && squads?.length === 0 && !showCreateForm && (
                <div className="flex flex-col items-center justify-center min-h-[150px] text-center border border-dashed border-base-content/20 rounded-2xl p-6">
                  <People className="text-base-content/40 mb-3" size={40} />
                  <p className="text-base-content font-medium">No squads yet</p>
                  <p className="text-sm text-base-content/60 mt-1">
                    Create a squad to get started.
                  </p>
                </div>
              )}

              {/* Squad List */}
              {!isLoading && squads && squads.length > 0 && (
                <div className="space-y-2">
                  {squads.map((squad) => (
                    <div
                      key={squad.id}
                      className="flex items-center justify-between gap-4 p-3 rounded-xl border border-base-content/10 bg-base-100 hover:border-primary/20 transition-colors"
                    >
                      {editingSquadId === squad.id ? (
                        /* Inline Edit Form */
                        <form
                          id={`edit-squad-${squad.id}`}
                          onSubmit={onEditSubmit}
                          className="flex-1 flex flex-col sm:flex-row gap-3"
                        >
                          <div className="flex-1">
                            <Controller
                              name="name"
                              control={editControl}
                              render={({ field }) => (
                                <input
                                  {...field}
                                  placeholder="Squad name"
                                  className={`input input-bordered input-sm w-full rounded-xl ${
                                    editErrors.name ? "input-error" : ""
                                  }`}
                                />
                              )}
                            />
                            {editErrors.name && (
                              <span className="text-error text-xs mt-1 block">
                                {editErrors.name.message}
                              </span>
                            )}
                          </div>
                          <div className="flex-1">
                            <Controller
                              name="description"
                              control={editControl}
                              render={({ field }) => (
                                <input
                                  {...field}
                                  placeholder="Description (optional)"
                                  className="input input-bordered input-sm w-full rounded-xl"
                                />
                              )}
                            />
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              type="submit"
                              disabled={isMutating}
                              className="btn btn-primary btn-xs rounded-xl motion-interactive"
                            >
                              {updateSquad.isPending ? (
                                <span className="loading loading-spinner loading-xs" />
                              ) : (
                                "Save"
                              )}
                            </button>
                            <button
                              type="button"
                              onClick={cancelEditing}
                              className="btn btn-ghost btn-xs rounded-xl motion-interactive"
                            >
                              Cancel
                            </button>
                          </div>
                        </form>
                      ) : (
                        /* Squad Display */
                        <>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-base-content truncate">
                                {squad.name}
                              </span>
                              <span
                                className={`badge badge-sm rounded-lg ${
                                  squad.is_active
                                    ? "badge-success bg-success/10 text-success border-none"
                                    : "badge-ghost bg-base-200 text-base-content/60 border-none"
                                }`}
                              >
                                {squad.is_active ? "Active" : "Inactive"}
                              </span>
                            </div>
                            {squad.description && (
                              <p className="text-xs text-base-content/60 mt-0.5 truncate">
                                {squad.description}
                              </p>
                            )}
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              onClick={() => startEditing(squad)}
                              className="btn btn-ghost btn-xs text-primary hover:bg-primary/10 rounded-xl motion-interactive"
                            >
                              <Edit2 size={14} />
                            </button>
                            <button
                              onClick={() => setDeletingSquadId(squad.id)}
                              className="btn btn-ghost btn-xs text-error hover:bg-error/10 rounded-xl motion-interactive"
                            >
                              <Trash size={14} />
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Create New Squad Form */}
              {showCreateForm && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="border border-dashed border-primary/30 rounded-2xl p-4 bg-primary/5"
                >
                  <h4 className="font-semibold text-sm text-base-content mb-3">
                    New Squad
                  </h4>
                  <form onSubmit={onCreateSubmit} className="space-y-3">
                    <Controller
                      name="name"
                      control={control}
                      render={({ field }) => (
                        <label className="form-control w-full">
                          <div className="label pb-1">
                            <span className="label-text font-medium text-xs">
                              Squad Name
                            </span>
                          </div>
                          <input
                            {...field}
                            placeholder="e.g. Frontend Squad"
                            className={`input input-bordered w-full rounded-xl ${
                              errors.name ? "input-error" : ""
                            }`}
                          />
                          {errors.name && (
                            <span className="text-error text-xs mt-1">
                              {errors.name.message}
                            </span>
                          )}
                        </label>
                      )}
                    />
                    <Controller
                      name="description"
                      control={control}
                      render={({ field }) => (
                        <label className="form-control w-full">
                          <div className="label pb-1">
                            <span className="label-text font-medium text-xs">
                              Description
                            </span>
                          </div>
                          <textarea
                            {...field}
                            placeholder="Optional description"
                            className="textarea textarea-bordered w-full rounded-xl"
                            rows={2}
                          />
                        </label>
                      )}
                    />
                    <Controller
                      name="is_active"
                      control={control}
                      render={({ field }) => (
                        <label className="label cursor-pointer justify-start gap-3">
                          <input
                            type="checkbox"
                            checked={!!field.value}
                            onChange={(e) => field.onChange(e.target.checked)}
                            className="checkbox checkbox-primary checkbox-sm"
                          />
                          <TickSquare className="w-4 h-4 text-success" />
                          <span className="label-text text-xs font-medium">
                            Active
                          </span>
                        </label>
                      )}
                    />
                    <div className="flex justify-end gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => {
                          setShowCreateForm(false);
                          reset({ name: "", description: "", is_active: true });
                        }}
                        className="btn btn-ghost btn-sm rounded-xl motion-interactive"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={isMutating}
                        className="btn btn-primary btn-sm rounded-xl motion-interactive"
                      >
                        {createSquad.isPending ? (
                          <span className="loading loading-spinner loading-sm" />
                        ) : (
                          "Create Squad"
                        )}
                      </button>
                    </div>
                  </form>
                </motion.div>
              )}
            </div>

            {/* Footer */}
            <div className="p-6 flex-shrink-0 border-t border-base-content/10 bg-base-200/30 rounded-b-2xl flex justify-between items-center">
              <span className="text-xs text-base-content/50">
                {squads?.length ?? 0} squad{squads?.length !== 1 ? "s" : ""}
              </span>
              {!showCreateForm && (
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateForm(true);
                    setEditingSquadId(null);
                  }}
                  className="btn btn-primary btn-sm rounded-xl gap-1.5 motion-interactive"
                >
                  <Add size={16} />
                  New Squad
                </button>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  return (
    <>
      {typeof document !== "undefined" ? createPortal(modalContent, document.body) : null}
      <ConfirmationModal
        isOpen={deletingSquadId !== null}
        onClose={() => setDeletingSquadId(null)}
        onConfirm={handleDeleteConfirm}
        title="Delete Squad"
        message="Are you sure you want to delete this squad? This action cannot be undone."
        isLoading={deleteSquad.isPending}
      />
    </>
  );
};
