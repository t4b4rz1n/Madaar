import { motion } from "framer-motion";
import { ProfileEditForm } from "../components/ProfileEditForm";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
};

const itemVariants = {
  hidden: { y: 15, opacity: 0 },
  visible: { y: 0, opacity: 1 },
};

const ProfilePage = () => {
  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="bg-transparent min-h-[calc(100vh-121px)] p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto"
    >
      <motion.div variants={itemVariants} className="flex flex-col gap-1 border-b border-base-content/10 pb-6 mb-8">
        <h1 className="text-3xl font-black tracking-tight text-base-content">
          Account Settings
        </h1>
        <p className="text-sm font-semibold text-base-content/50 mt-1">
          Manage your personal information, account security, and notification preferences.
        </p>
      </motion.div>
      <motion.div variants={itemVariants}>
        <ProfileEditForm />
      </motion.div>
    </motion.div>
  );
};

export default ProfilePage;
