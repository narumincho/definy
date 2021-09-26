/**
 * definy, ナルミンチョの創作記録で扱うファイルの種類
 */
export type FileType = "Png" | "TypeScript" | "JavaScript" | "Html";

/** PNGファイル. 劣化しない画像形式. 透明もサポートしている `image/png` */
export const fileTypeImagePng: FileType = "Png";

/**
 * TypeScript のファイル形式. 拡張子は `ts`
 */
export const fileTypeTypeScript: FileType = "TypeScript";

export const fileTypeToMimeType = (fileType: FileType | undefined): string => {
  switch (fileType) {
    case "Png":
      return "image/png";
    case "TypeScript":
      return "text/typescript";
    case "JavaScript":
      return "text/javascript";
    case "Html":
      return "text/html";
    case undefined:
      return "application/octet-stream";
  }
};
