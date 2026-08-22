import { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Send,
  CloseCircle,
  Link as LinkIcon,
  MessageText,
  TickCircle,
} from "iconsax-reactjs";
import { useSendNotification } from "../hooks/useNotifications";
import {
  notificationSchema,
  type NotificationFormData,
} from "../validation/notificationSchema";

const backdropVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
};


const modalVariants = {
  hidden: { opacity: 0, y: 20, scale: 0.95 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.3,
      ease: "easeOut" as const,
    },
  },
  exit: {
    opacity: 0,
    y: 20,
    scale: 0.95,
    transition: {
      duration: 0.2,
    },
  },
};

interface SendNotificationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SendNotificationModal = ({
  isOpen,
  onClose,
}: SendNotificationModalProps) => {
  const {
    control,
    handleSubmit,
    reset,
    watch,
    formState: { isValid, errors },
  } = useForm<NotificationFormData>({
    resolver: zodResolver(notificationSchema),
    defaultValues: {
      text: "",
      link: undefined,
    },
    mode: "onChange",
  });

  const sendMutation = useSendNotification();

  useEffect(() => {
    if (isOpen) {
      reset({
        text: "",
        link: undefined,
      });
    }
  }, [isOpen, reset]);

  const onSubmit = handleSubmit((data: NotificationFormData) => {
    sendMutation.mutate(data, {
      onSuccess: () => {
        onClose();
        reset();
      },
    });
  });

  const isLoading = sendMutation.isPending;
  const textValue = watch("text");

  return (
    <AnimatePresence>
      {isOpen &&  (
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
            className="relative w-full max-w-2xl bg-base-100 rounded-2xl shadow-2xl max-h-[90vh] flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="px-6 py-5 border-b border-base-content/10">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-primary/10 text-primary rounded-xl">
                    <Send size={24} />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-base-content">
                      Send New Notification
                    </h3>
                    <p className="text-base-content/60 text-sm mt-0.5">
                      Broadcast a message to users
                    </p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-base-content/5 rounded-lg transition-colors"
                  disabled={isLoading}
                >
                  <CloseCircle size={22} className="text-base-content/60" />
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-6">
              <form onSubmit={onSubmit} className="space-y-5">
                {/* Message Field */}
                <div>
                  <label className="block mb-2">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="p-2 bg-primary/10 rounded-lg">
                        <MessageText className="w-4 h-4 text-primary" />
                      </div>
                      <div>
                        <span className="text-sm font-semibold text-base-content">
                          Message
                        </span>
                        <span className="text-error ml-1">*</span>
                      </div>
                    </div>
                  </label>

                  <Controller
                    name="text"
                    control={control}
                    render={({ field }) => (
                      <div className="relative">
                        <textarea
                          {...field}
                          placeholder="Write an engaging notification message..."
                          className={`textarea w-full h-32 resize-none rounded-xl text-sm transition-all duration-200 bg-base-100 focus:outline-none ${
                            errors.text
                              ? "border-2 border-error focus:border-error"
                              : "border border-base-content/20 focus:border-primary focus:ring-2 focus:ring-primary/10"
                          }`}
                          maxLength={500}
                        />
                        <div className="flex items-center justify-between mt-2">
                          {errors.text ? (
                            <motion.span
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              className="text-error text-xs flex items-center gap-1.5"
                            >
                              <CloseCircle className="w-3.5 h-3.5" />
                              {errors.text.message}
                            </motion.span>
                          ) : (
                            <span className="text-xs text-base-content/50">
                              Write a clear and concise message
                            </span>
                          )}
                          <span
                            className={`text-xs ${
                              (textValue?.length || 0) > 450
                                ? "text-warning"
                                : "text-base-content/50"
                            }`}
                          >
                            {textValue?.length || 0}/500
                          </span>
                        </div>
                      </div>
                    )}
                  />
                </div>

                {/* Link Field */}
                <div>
                  <label className="block mb-2">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="p-2 bg-success/10 rounded-lg">
                        <LinkIcon className="w-4 h-4 text-success" />
                      </div>
                      <div>
                        <span className="text-sm font-semibold text-base-content">
                          Link
                        </span>
                        <span className="text-base-content/50 text-xs ml-2">
                          (Optional)
                        </span>
                      </div>
                    </div>
                  </label>

                  <Controller
                    name="link"
                    control={control}
                    render={({ field }) => (
                      <div>
                        <input
                          {...field}
                          type="text"
                          placeholder="https://example.com"
                          className={`input w-full rounded-xl text-sm transition-all duration-200 bg-base-100 focus:outline-none ${
                            errors.link
                              ? "border-2 border-error focus:border-error"
                              : "border border-base-content/20 focus:border-success focus:ring-2 focus:ring-success/10"
                          }`}
                        />
                        {errors.link ? (
                          <motion.span
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="text-error text-xs flex items-center gap-1.5 mt-2"
                          >
                            <CloseCircle className="w-3.5 h-3.5" />
                            {errors.link.message}
                          </motion.span>
                        ) : (
                          <span className="text-xs text-base-content/50 mt-2 block">
                            Add a URL for users to visit (optional)
                          </span>
                        )}
                      </div>
                    )}
                  />
                </div>

                {/* Info Banner */}
                <div className="bg-primary/5 border border-primary/20 rounded-xl p-4">
                  <div className="flex items-start gap-3">
                    <div className="p-1.5 bg-primary/10 rounded-lg flex-shrink-0 mt-0.5">
                      <TickCircle className="w-4 h-4 text-primary" />
                    </div>
                    <div className="flex-1">
                      <h4 className="text-sm font-semibold text-base-content mb-1">
                        Broadcast Notification
                      </h4>
                      <p className="text-xs text-base-content/70 leading-relaxed">
                        This notification will be sent to all users. Make sure
                        your message is clear and the link (if provided) is
                        correct.
                      </p>
                    </div>
                  </div>
                </div>
              </form>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-base-content/10 bg-base-200/30">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-2 text-sm">
                  {isValid ? (
                    <span className="flex items-center gap-2 text-success font-medium">
                      <TickCircle className="w-4 h-4" />
                      Ready to send
                    </span>
                  ) : (
                    <span className="text-base-content/60">
                      Fill in the required fields
                    </span>
                  )}
                </div>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={onClose}
                    className="btn btn-ghost rounded-xl px-5"
                    disabled={isLoading}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    onClick={onSubmit}
                    disabled={isLoading || !isValid}
                    className="btn btn-primary rounded-xl px-6"
                  >
                    {isLoading ? (
                      <span className="flex items-center gap-2">
                        <span className="loading loading-spinner loading-sm"></span>
                        Sending...
                      </span>
                    ) : (
                      <span className="flex items-center gap-2">
                        <Send className="w-4 h-4" />
                        Send Notification
                      </span>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
