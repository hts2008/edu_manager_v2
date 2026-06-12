export const motionDurations = {
  instant: 0.1,
  fast: 0.18,
  standard: 0.24,
  emphasis: 0.34,
};

export const motionEasings = {
  standard: [0.22, 1, 0.36, 1],
  exit: [0.4, 0, 1, 1],
};

export function getMotionTransition({ reduced = false, duration = "fast" } = {}) {
  if (reduced) {
    return {
      duration: 0.08,
      ease: motionEasings.standard,
    };
  }

  return {
    duration: motionDurations[duration] || motionDurations.fast,
    ease: motionEasings.standard,
  };
}

export function getPageMotion(reduced = false) {
  return {
    initial: reduced ? { opacity: 0 } : { opacity: 0, y: 6 },
    animate: reduced ? { opacity: 1 } : { opacity: 1, y: 0 },
    exit: reduced ? { opacity: 0 } : { opacity: 0, y: 3 },
    transition: getMotionTransition({ reduced, duration: "fast" }),
  };
}

export function getModalMotion(reduced = false) {
  return {
    initial: reduced ? { opacity: 0 } : { opacity: 0, scale: 0.98, y: 12 },
    animate: reduced ? { opacity: 1 } : { opacity: 1, scale: 1, y: 0 },
    exit: reduced ? { opacity: 0 } : { opacity: 0, scale: 0.98, y: 8 },
    transition: getMotionTransition({ reduced, duration: "standard" }),
  };
}
