export const numberToString = (value: number) => {
  return value.toString();
};

export const unknownValueToString = (value: unknown) => {
  return JSON.stringify(value);
};
