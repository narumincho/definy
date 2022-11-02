import * as base64 from "https://denopkg.com/chiefbiiko/base64@master/mod.ts";
import { shell } from "../shell.ts";

type BuildClientResult = {
  readonly iconPath: string;
  readonly iconContent: string;
  readonly scriptPath: string;
  readonly scriptContent: string;
};

const clientDistPath = "./definy-rpc/browserClient/dist/";

const buildClient = async (): Promise<BuildClientResult | undefined> => {
  const viteBuildProcessStatus = await Deno.run({
    cwd: "./definy-rpc/browserClient",
    cmd: [shell, "pnpm", "run", "definy-rpc-client-build"],
  }).status();

  console.log(viteBuildProcessStatus);
  const result: {
    -readonly [key in keyof BuildClientResult]:
      | BuildClientResult[key]
      | undefined;
  } = {
    iconContent: undefined,
    iconPath: undefined,
    scriptContent: undefined,
    scriptPath: undefined,
  };

  for (const dist of Deno.readDirSync(clientDistPath + "assets")) {
    if (dist.name.endsWith(".png")) {
      console.log("png 発見", dist.name);
      result.iconPath = "/assets/" + dist.name;
      result.iconContent = base64.fromUint8Array(
        await Deno.readFile(clientDistPath + "assets/" + dist.name)
      );
    } else if (dist.name.endsWith(".js")) {
      console.log("js 発見", dist.name);
      result.scriptPath = "/assets/" + dist.name;
      result.scriptContent = await Deno.readTextFile(
        clientDistPath + "assets/" + dist.name
      );
    }
  }

  if (
    result.iconPath === undefined ||
    result.iconContent === undefined ||
    result.scriptPath === undefined ||
    result.scriptContent === undefined
  ) {
    throw new Error("build dist 足りない...");
  }
  return {
    iconContent: result.iconContent,
    iconPath: result.iconPath,
    scriptPath: result.scriptPath,
    scriptContent: result.scriptContent,
  };
};

const main = async (): Promise<void> => {
  const clientBuildResult = await buildClient();
  Deno.writeTextFile(
    "./deno-lib/definyRpc/server/browserClient.json",
    JSON.stringify(clientBuildResult)
  );
};

await main();
