export const indexHtmlPath = (distributionPath: string): string => {
  return distributionPath + "/index.html";
};

export const localhostOrigin = (portNumber: number): string => {
  return `http://localhost:${portNumber}`;
};

export const staticResourcePathObjectToUrlObject = <ResourceObject>(
  resourceObject: ResourceObject,
  portNumber: number
): { [key in keyof ResourceObject]: URL } =>
  Object.fromEntries(
    Object.entries(resourceObject).map(([path]) => [
      path,
      new URL(localhostOrigin(portNumber) + "/" + path),
    ])
  ) as { [key in keyof ResourceObject]: URL };
