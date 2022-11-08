export const urlFromString = (url: string): URL | undefined => {
  try {
    return new URL(url);
  } catch (_) {
    return undefined;
  }
};
