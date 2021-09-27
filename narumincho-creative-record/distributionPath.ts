import {
  DirectoryPath,
  DirectoryPathAndFileName,
  directoryPathFrom,
} from "../gen/fileSystem/data";

const naruminchoCreativeRecordDirectoryName = "narumincho-creative-record";

export const distributionPath: DirectoryPath = directoryPathFrom([
  naruminchoCreativeRecordDirectoryName,
  "dist",
]);

export const staticResourcePath: DirectoryPath = directoryPathFrom([
  naruminchoCreativeRecordDirectoryName,
  "resource",
]);

export const clientScriptPath: DirectoryPathAndFileName = {
  directoryPath: directoryPathFrom([naruminchoCreativeRecordDirectoryName]),
  fileName: {
    name: "client",
    fileType: "TypeScript",
  },
};

export const portNumber = 8080;
