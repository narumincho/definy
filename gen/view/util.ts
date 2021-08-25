export const indexHtmlPath = (distributionPath: string): string => {
  return distributionPath + "/index.html";
};

export const localhostOrigin = (portNumber: number): string => {
  return `http://localhost:${portNumber}`;
};
