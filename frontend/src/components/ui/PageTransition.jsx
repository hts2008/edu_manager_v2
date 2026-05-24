import { motion as Motion } from "framer-motion";
import { useLocation } from "react-router-dom";

// PREMIUM UI: Framer Motion page transition wrapper
export default function PageTransition({ children }) {
  const location = useLocation();

  return (
    <Motion.div
      key={location.pathname}
      initial={{ opacity: 0, y: 15, filter: "blur(4px)" }}
      animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      exit={{ opacity: 0, y: -15, filter: "blur(4px)" }}
      transition={{
        duration: 0.4,
        ease: [0.22, 1, 0.36, 1],
      }}
      className="w-full h-full"
    >
      {children}
    </Motion.div>
  );
}
