import {
  features,
  predictProba,
} from "https://cdn.skypack.dev/wakachigaki@1.3.2?dts";

const text = "あおいりんごがなっていた";
const splitLevels = predictProba(features(text));

for (const [i, char] of [...text].entries()) {
  console.log(char, (splitLevels[i] as number) > 0.1);
}
