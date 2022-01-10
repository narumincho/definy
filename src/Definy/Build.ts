import { buildClientAndFunction } from "../../build/main";

export const buildInTypeScript = (
  isDevelopment: boolean,
  origin: string
): void => {
  buildClientAndFunction(isDevelopment ? "Develop" : "Release", origin);
};
