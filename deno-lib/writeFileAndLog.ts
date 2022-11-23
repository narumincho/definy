export const writeTextFileWithLog = async (
  path: string,
  content: string,
): Promise<void> => {
  console.log(path + " に書き込み中... " + content.length + "文字");
  await Deno.writeTextFile(path, content);
  console.log(path + " に書き込み完了!");
};
