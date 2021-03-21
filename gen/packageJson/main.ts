import * as d from "../../data";

export type PackageJson = {
  readonly name: string;
  readonly version: string;
  readonly description: string;
  readonly gitHubAccountName: string;
  readonly gitHubRepositoryName: string;
  readonly entryPoint: string;
  readonly homepage: string;
  readonly author: string;
  readonly nodeVersion: string;
  readonly dependencies: ReadonlyMap<string, string>;
  /**
   * 型定義(.d.ts か .ts ??)のファイルパス
   */
  readonly typeFilePath: string;
};

/**
 * npm で パッケージをリリースするときや, firebase の Cloud Functions for Firebase でつかう ` `package.json` を出力する
 *
 * ライセンスは常に MIT になる.
 * クリエイティブ・コモンズは, ロゴ用意してあったり, サイトも翻訳されていたりとしっかりしているので, 使いたいが, GitHub でリポジトリを作成するときの選択肢に出ないため, 各サイトのUI があまり対応していないと判断したため今回は選択肢なし
 *
 */
export const toString = (
  packageJson: PackageJson
): d.Result<string, string> => {
  if (packageJson.name.length > 214) {
    return d.Result.Error(
      "package.json の name は 214文字以内である必要があります"
    );
  }
  return d.Result.Ok(
    JSON.stringify({
      name: packageJson.name,
      version: packageJson.version,
      description: packageJson.description,
      repository: {
        type: "git",
        url: `git+https://github.com/${packageJson.gitHubAccountName}/${packageJson.gitHubRepositoryName}.git`,
      },
      license: "MIT",
      main: packageJson.entryPoint,
      homepage: packageJson.homepage,
      author: packageJson.author,
      engines: {
        node: packageJson.nodeVersion,
      },
      dependencies: Object.fromEntries(packageJson.dependencies),
      types: packageJson.typeFilePath,
    })
  );
};
