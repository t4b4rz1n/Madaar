import { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Add, Edit, CloseCircle } from "iconsax-reactjs";
import { createPortal } from "react-dom";
import { useCreateUser, useUpdateUser } from "../hooks/useUsers";
import { UserForm } from "./UserForm";
import type { User, UserFormData, UserUpdateData } from "../types"; //
import { createUserSchema, updateUserSchema } from "../validation";

const backdropVariants = { hidden: { opacity: 0 }, visible: { opacity: 1 } };
const modalVariants = {
  hidden: { opacity: 0, y: 30, scale: 0.98 },
  visible: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, y: 30, scale: 0.98 },
};

interface CreateEditUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  user?: User | null;
}

export const CreateEditUserModal = ({
  isOpen,
  onClose,
  user,
}: CreateEditUserModalProps) => {
  const isEditMode = !!user;

  // Select the appropriate schema based on mode
  const schema = isEditMode ? updateUserSchema : createUserSchema;

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<UserFormData>({
    // We cast to 'any' here because updateUserSchema output (UserUpdateData)
    // is a subset of UserFormData (missing password), which confuses useForm types.
    resolver: zodResolver(schema) as any,
    defaultValues: {
      username: "",
      email: "",
      password: "",
      first_name: "",
      last_name: "",
      is_active: true,
      is_staff: false,
    },
  });

  const createMutation = useCreateUser();
  const updateMutation = useUpdateUser();

  useEffect(() => {
    if (isOpen) {
      if (user) {
        reset({
          username: user.username,
          email: user.email,
          first_name: user.first_name,
          last_name: user.last_name,
          is_active: user.is_active,
          is_staff: user.is_staff,
          password: "", // Password field exists in form state but is unused in edit
        });
      } else {
        reset({
          username: "",
          email: "",
          password: "",
          first_name: "",
          last_name: "",
          is_active: true,
          is_staff: false,
        });
      }
    }
  }, [isOpen, user, reset]);

  const onSubmit = handleSubmit((data) => {
    if (isEditMode && user) {
      // Remove password from the data object
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { password, ...rest } = data;

      // Cast the remaining fields to UserUpdateData to satisfy the mutation type
      const updatePayload = rest as UserUpdateData;

      updateMutation.mutate(
        { id: user.id, data: updatePayload },
        {
          onSuccess: () => {
            onClose();
          },
        }
      );
    } else {
      // In create mode, data is already fully compliant UserFormData
      createMutation.mutate(data, {
        onSuccess: () => {
          onClose();
        },
      });
    }
  });

  const isLoading = createMutation.isPending || updateMutation.isPending;

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
                    {isEditMode ? <Edit size={28} /> : <Add size={28} />}
                  </div>
                  <div>
                    <h3 className="font-bold text-2xl text-base-content">
                      {isEditMode ? "Edit User" : "Create New User"}
                    </h3>
                    <p className="text-base-content/70 text-sm">
                      {isEditMode
                        ? "Update user details"
                        : "Add a new user to the system"}
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
            <div className="flex-1 overflow-y-auto px-6 pt-6">
              <form onSubmit={onSubmit}>
                <UserForm
                  control={control}
                  errors={errors}
                  editMode={isEditMode}
                />
              </form>
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
                  ) : isEditMode ? (
                    "Update User"
                  ) : (
                    "Create User"
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
