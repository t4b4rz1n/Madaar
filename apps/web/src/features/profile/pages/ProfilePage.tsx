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
      className="bg-base-100 min-h-[calc(100vh-121px)] border border-base-content/8 rounded-2xl p-4 sm:p-6"
    >
      <motion.div variants={itemVariants} className="flex flex-col gap-1 border-b border-base-content/8 pb-4">
        <h1 className="text-2xl font-bold tracking-tight text-base-content sm:text-3xl">
          Profile &amp; Account
        </h1>
        <p className="text-xs font-medium text-base-content/50">
          Manage your personal information, security preferences and account settings.
        </p>
      </motion.div>
      <motion.div variants={itemVariants} className="mt-6">
        <ProfileEditForm />
      </motion.div>
    </motion.div>
  );
};

export default ProfilePage;
