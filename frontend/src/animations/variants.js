export const popIn = {
  hidden: { opacity: 0, scale: 0.92, y: 12 },
  show: { opacity: 1, scale: 1, y: 0 },
};

export const stagger = {
  hidden: {},
  show: {
    transition: {
      staggerChildren: 0.08,
    },
  },
};
