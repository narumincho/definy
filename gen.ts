export {};

type CharType = "Digit" | "AlphabetLowercase" | "AlphabetUppercase";

const f = (c: string) => {
  return `else instance charSymbolToCharType${instanceName(
    c
  )} :: CharSymbolToCharType "${c}" (${cToCharType(c)} "${c}")`;
};
const cToCharType = (c: string): CharType => {
  if ("0123456789".includes(c)) {
    return "Digit";
  }
  if (c.toLowerCase() === c) {
    return "AlphabetLowercase";
  }
  return "AlphabetUppercase";
};
const instanceName = (c: string) => {
  switch (cToCharType(c)) {
    case "Digit":
      return c;
    case "AlphabetLowercase":
      return "Lower" + c.toUpperCase();
    case "AlphabetUppercase":
      return "Upper" + c;
  }
};

console.log(
  [..."ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"]
    .map(f)
    .join("\n")
);
