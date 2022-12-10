export const writeTextFileWithLog = async (
  path: URL,
  content: string,
): Promise<void> => {
  console.log(path.toString() + " に書き込み中... " + content.length + "文字");
  await Deno.writeTextFile(path, content);
  console.log(path.toString() + " に書き込み完了!");
};
