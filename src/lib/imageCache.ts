// Global cache for failed external images
const failedImages = new Set<string>();

export const imageCache = {
  markFailed: (url: string) => failedImages.add(url),
  hasFailed: (url: string) => failedImages.has(url),
  clear: () => failedImages.clear(),
};

// Preload all local token logos
export const preloadLocalLogos = () => {
  const modules = import.meta.glob("../assets/tokens/*.{svg,png,webp}", {
    eager: true,
  }) as Record<string, { default: string }>;

  Object.values(modules).forEach((mod) => {
    const img = new Image();
    img.src = mod.default;
  });
};
