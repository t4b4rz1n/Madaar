import { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CloseCircle, Messages2, Tag, Flag, TickCircle, Add } from "iconsax-reactjs";
import { createPortal } from "react-dom";
import { useCreateTicket, useTicketTypes } from "../hooks/useTickets";
import type { TicketFormData } from "../types";
import { ticketSchema } from "../validation";
import InputField from "../../../components/InputField";

const backdropVariants = { hidden: { opacity: 0 }, visible: { opacity: 1 } };
const modalVariants = {
  hidden: { opacity: 0, y: 30, scale: 0.98 },
  visible: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, y: 30, scale: 0.98 },
};

interface CreateTicketModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CreateTicketModal = ({
  isOpen,
  onClose,
}: CreateTicketModalProps) => {
  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<TicketFormData>({
    resolver: zodResolver(ticketSchema),
    defaultValues: {
      title: "",
      ticket_type: undefined,
      priority: "low",
      status: "open",
    },
  });

  const createMutation = useCreateTicket();
  const { data: ticketTypesResponse } = useTicketTypes(new URLSearchParams({ page_size: "100" }));

  useEffect(() => {
    if (isOpen) {
      reset({
        title: "",
        ticket_type: undefined,
        priority: "low",
        status: "open",
      });
    }
  }, [isOpen, reset]);

  const onSubmit = handleSubmit((data) => {
    createMutation.mutate(data, {
      onSuccess: () => {
        onClose();
      },
    });
  });

  const isLoading = createMutation.isPending;

  const priorityOptions = [
    { value: "low", label: "Low", color: "text-success", bg: "bg-success/10 border-success/20 hover:bg-success/20" },
    { value: "medium", label: "Medium", color: "text-warning", bg: "bg-warning/10 border-warning/20 hover:bg-warning/20" },
    { value: "high", label: "High", color: "text-error", bg: "bg-error/10 border-error/20 hover:bg-error/20" },
  ];

  const statusOptions = [
    { value: "open", label: "Open", color: "text-info", bg: "bg-info/10 border-info/20 hover:bg-info/20" },
    { value: "answered", label: "Answered", color: "text-success", bg: "bg-success/10 border-success/20 hover:bg-success/20" },
    { value: "closed", label: "Closed", color: "text-base-content/60", bg: "bg-base-content/10 border-base-content/20 hover:bg-base-content/15" },
  ];

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
            className="relative w-full max-w-2xl bg-base-100 rounded-2xl shadow-xl m-4 max-h-[90vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="p-6 flex-shrink-0 border-b border-base-content/10">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-primary/10 text-primary rounded-xl">
                    <Messages2 size={28} />
                  </div>
                  <div>
                    <h3 className="font-bold text-2xl text-base-content">
                      Open Support Ticket
                    </h3>
                    <p className="text-base-content/70 text-sm">
                      Create a new support ticket to help users with their requests.
                    </p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-base-content/10 rounded-lg transition-colors"
                  disabled={isLoading}
                >
                  <CloseCircle className="w-6 h-6 text-base-content/60" />
                </button>
              </div>
            </div>

            {/* Form Content */}
            <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
              {/* Title Field */}
              <Controller
                name="title"
                control={control}
                render={({ field }) => (
                  <div className="form-control w-full">
                    <div className="label pb-1.5">
                      <span className="label-text text-xs font-semibold uppercase tracking-wider text-base-content/60 flex items-center gap-1.5">
                        <Tag size={14} />
                        Subject
                      </span>
                    </div>
                    <InputField
                      {...field}
                      placeholder="Enter ticket subject"
                      classNameInput={`!shadow-none focus:border-primary ${errors.title ? "border-error" : "border-base-300"}`}
                    />
                    {errors.title && (
                      <span className="text-error text-xs mt-1.5 flex items-center gap-1">
                        <span className="inline-block w-1 h-1 rounded-full bg-error" />
                        {errors.title.message}
                      </span>
                    )}
                  </div>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {/* Ticket Type */}
                <Controller
                  name="ticket_type"
                  control={control}
                  render={({ field }) => (
                    <div className="form-control w-full">
                      <div className="label pb-1.5">
                        <span className="label-text text-xs font-semibold uppercase tracking-wider text-base-content/60 flex items-center gap-1.5">
                          <Tag size={14} />
                          Category
                        </span>
                      </div>
                      <select
                        value={field.value || ""}
                        onChange={(e) => field.onChange(Number(e.target.value))}
                        className="select select-bordered w-full !shadow-none border-base-300"
                      >
                        <option value="">Select Category</option>
                        {ticketTypesResponse?.results?.map((type) => (
                          <option key={type.id} value={type.id}>
                            {type.name}
                          </option>
                        ))}
                      </select>
                      {errors.ticket_type && (
                        <span className="text-error text-xs mt-1.5">{errors.ticket_type.message}</span>
                      )}
                    </div>
                  )}
                />

                {/* Priority */}
                <Controller
                  name="priority"
                  control={control}
                  render={({ field }) => (
                    <div className="form-control w-full">
                      <div className="label pb-1.5">
                        <span className="label-text text-xs font-semibold uppercase tracking-wider text-base-content/60 flex items-center gap-1.5">
                          <Flag size={14} />
                          Priority
                        </span>
                      </div>
                      <div className="flex flex-col gap-1.5">
                        {priorityOptions.map((opt) => (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() => field.onChange(opt.value)}
                            className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-semibold transition-all duration-200 ${
                              field.value === opt.value
                                ? opt.bg + " " + opt.color
                                : "bg-base-200 border-base-content/10 text-base-content/60 hover:bg-base-300"
                            }`}
                          >
                            {field.value === opt.value && <TickCircle size={14} className={opt.color} variant="Bold" />}
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                />

                {/* Status */}
                <Controller
                  name="status"
                  control={control}
                  render={({ field }) => (
                    <div className="form-control w-full">
                      <div className="label pb-1.5">
                        <span className="label-text text-xs font-semibold uppercase tracking-wider text-base-content/60 flex items-center gap-1.5">
                          <TickCircle size={14} />
                          Status
                        </span>
                      </div>
                      <div className="flex flex-col gap-1.5">
                        {statusOptions.map((opt) => (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() => field.onChange(opt.value)}
                            className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-semibold transition-all duration-200 ${
                              field.value === opt.value
                                ? opt.bg + " " + opt.color
                                : "bg-base-200 border-base-content/10 text-base-content/60 hover:bg-base-300"
                            }`}
                          >
                            {field.value === opt.value && <TickCircle size={14} className={opt.color} variant="Bold" />}
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                />
              </div>
            </div>

            {/* Footer */}
            <div className="p-6 flex-shrink-0 border-t border-base-content/10 bg-base-200/30 rounded-b-2xl">
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="btn btn-ghost rounded-xl"
                  disabled={isLoading}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={onSubmit}
                  disabled={isLoading}
                  className="btn btn-primary rounded-xl px-6"
                >
                  {isLoading ? (
                    <span className="flex items-center gap-2">
                      <span className="loading loading-spinner loading-sm"></span>
                      Saving...
                    </span>
                  ) : (
                    <>
                      <Add size={18} />
                      Submit Ticket
                    </>
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
