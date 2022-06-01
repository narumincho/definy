export const compare = <Props>(prev: Props, next: Props): boolean => {
  for (const key of new Set<keyof Props>([
    ...(Object.keys(prev) as unknown as ReadonlyArray<keyof Props>),
    ...(Object.keys(next) as unknown as ReadonlyArray<keyof Props>),
  ])) {
    if (prev[key] !== next[key]) {
      console.log(`${key.toString()}が変化した.`, {
        prev: prev[key],
        next: next[key],
      });
      return true;
    }
  }
  return false;
};
