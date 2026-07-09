import { motion } from "framer-motion";
import { ProfileEditForm } from "../components/ProfileEditForm";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
};

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: { y: 0, opacity: 1 },
};

const ProfilePage = () => {
  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="bg-base-100 min-h-[calc(100vh-121px)] backdrop-blur-lg border border-base-content/10 rounded-2xl p-4 sm:p-6"
    >
      <motion.div variants={itemVariants} className="flex flex-col gap-4">
        <div>
          <h1 className="text-3xl font-bold text-base-content">User Account</h1>
          <p className="mt-1 text-base-content/70">
            Manage your account information.
          </p>
        </div>
      </motion.div>
      <motion.div variants={itemVariants} className="mt-8">
        <ProfileEditForm />
      </motion.div>
    </motion.div>
  );
};

export default ProfilePage;
