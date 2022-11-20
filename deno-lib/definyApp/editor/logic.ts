export const timeToDisplayText = (
  date: Date,
): {
  readonly value: number;
  readonly unit: string;
  readonly after: boolean;
} => {
  const diff = date.getTime() - new Date().getTime();
  const after = diff < 0;
  const diffAbs = Math.abs(diff);
  const diffDay = Math.floor(diffAbs / (1000 * 60 * 60 * 24));
  if (diffDay > 0) {
    return { value: diffDay, unit: "日", after };
  }
  const diffHour = Math.floor(diffAbs / (1000 * 60 * 60));
  if (diffHour > 0) {
    return { value: diffHour, unit: "時間", after };
  }
  const diffMinute = Math.floor(diffAbs / (1000 * 60));
  if (diffMinute > 0) {
    return { value: diffMinute, unit: "分", after };
  }
  const diffSeconds = Math.floor(diffAbs / 1000);
  return { value: diffSeconds, unit: "秒", after };
};
