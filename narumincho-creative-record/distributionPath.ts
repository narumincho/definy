import { DirectoryPath, directoryPathFrom } from "../gen/fileSystem/data";

export const distributionPath: DirectoryPath = directoryPathFrom([
  "narumincho-creative-record",
  "dist",
]);

export const staticResourcePath: DirectoryPath = directoryPathFrom([
  "narumincho-creative-record",
  "resource",
]);

export const portNumber = 8080;
