let chunk = new Uint8Array();

export const appendChunk = (binary: Uint8Array): void => {
  chunk = new Uint8Array([...chunk, ...binary]);
};

export const getChunk = (): Uint8Array => {
  return chunk;
};

export const deleteChunk = (): void => {
  chunk = new Uint8Array();
};
