import { motion as Motion, useReducedMotion } from "framer-motion";
import { useLocation } from "react-router-dom";
import { getPageMotion } from "../../design/motion";

export default function PageTransition({ children }) {
  const location = useLocation();
  const reduceMotion = useReducedMotion();
  const pageMotion = getPageMotion(reduceMotion);

  return (
    <Motion.div
      key={location.pathname}
      initial={pageMotion.initial}
      animate={pageMotion.animate}
      transition={pageMotion.transition}
      className="h-full w-full will-change-[opacity,transform]"
    >
      {children}
    </Motion.div>
  );
}
