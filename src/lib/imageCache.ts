// Global cache to track failed external images and prevent retries
const failedImages = new Set<string>();

export const imageCache = {
  markFailed: (url: string) => failedImages.add(url),
  hasFailed: (url: string) => failedImages.has(url),
  clear: () => failedImages.clear(),
};
