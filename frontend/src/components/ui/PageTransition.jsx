import { useRef, useEffect } from "react";
import { useLocation } from "react-router-dom";

// VI: Simple page transition wrapper với CSS animation
export default function PageTransition({ children }) {
  const location = useLocation();
  const containerRef = useRef(null);

  useEffect(() => {
    // Trigger re-animation on route change
    const el = containerRef.current;
    if (el) {
      el.classList.remove("page-visible");
      // Force reflow
      void el.offsetWidth;
      el.classList.add("page-visible");
    }
  }, [location.pathname]);

  return (
    <div ref={containerRef} className="page-transition page-visible">
      {children}
    </div>
  );
}
