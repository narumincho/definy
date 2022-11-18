import { wakachigaki } from "../deps.ts";

const text = "あおいりんごがなっていた";
const splitLevels = wakachigaki.predictProba(wakachigaki.features(text));

for (const [i, char] of [...text].entries()) {
  console.log(char, (splitLevels[i] as number) > 0.1);
}
