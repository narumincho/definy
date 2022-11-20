export const timeToDisplayText = (
  date: Date,
): { readonly value: number; readonly unit: string } => {
  const diff = date.getTime() - new Date().getTime();
  const diffDay = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (diffDay > 0) {
    return { value: diffDay, unit: "日" };
  }
  const diffHour = Math.floor(diff / (1000 * 60 * 60));
  if (diffHour > 0) {
    return { value: diffHour, unit: "時間" };
  }
  const diffMinute = Math.floor(diff / (1000 * 60));
  if (diffMinute > 0) {
    return { value: diffMinute, unit: "分" };
  }
  const diffSeconds = Math.floor(diff / 1000);
  return { value: diffSeconds, unit: "秒" };
};
