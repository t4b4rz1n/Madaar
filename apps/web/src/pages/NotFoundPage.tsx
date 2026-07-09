import { motion } from "framer-motion";
import { ArrowLeft2 } from "iconsax-reactjs";
import { Link } from "react-router-dom";

const NotFoundPage = () => {
  return (
    <div className=" h-full flex flex-col items-center justify-center p-4 text-center">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-md w-full bg-base-100 rounded-3xl shadow-xl p-8 border border-base-content/10"
      >
        <h1 className="text-8xl font-black text-primary/20 mb-2">404</h1>
        <h2 className="text-2xl font-bold text-base-content mb-2">
          Page Not Found
        </h2>
        <p className="text-base-content/60 mb-8">
          The page you are looking for might have been removed, had its name
          changed, or is temporarily unavailable.
        </p>

        <Link to="/" className="btn btn-primary rounded-xl w-full gap-2">
          <ArrowLeft2 size={20} />
          Back to Dashboard
        </Link>
      </motion.div>
    </div>
  );
};

export default NotFoundPage;
