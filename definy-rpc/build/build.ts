import { build, emptyDir } from "https://deno.land/x/dnt@0.30.0/mod.ts";
import * as base64 from "https://denopkg.com/chiefbiiko/base64@master/mod.ts";
import { shell } from "./shell.ts";

type BuildClientResult = {
  readonly indexHtmlContent: string;
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
    indexHtmlContent: await Deno.readTextFile(clientDistPath + "index.html"),
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
    result.indexHtmlContent === undefined ||
    result.iconPath === undefined ||
    result.iconContent === undefined ||
    result.scriptPath === undefined ||
    result.scriptContent === undefined
  ) {
    throw new Error("build dist 足りない...");
  }
  return {
    indexHtmlContent: result.indexHtmlContent,
    iconContent: result.iconContent,
    iconPath: result.iconPath,
    scriptPath: result.scriptPath,
    scriptContent: result.scriptContent,
  };
};

const _buildToNodeJs = async (): Promise<void> => {
  await emptyDir("./npm");

  await build({
    entryPoints: ["./mod.ts"],
    outDir: "./npm",
    shims: {
      deno: true,
      undici: true,
    },
    package: {
      name: "definy-rpc-server",
      version: "0.0.0",
      description: "definy RPC server",
      license: "MIT",
      repository: {
        type: "git",
        url: "git+https://github.com/narumincho/definy.git",
      },
      bugs: {
        url: "https://github.com/narumincho/definy/discussions",
      },
    },
    skipSourceOutput: true,
  });
};

const main = async (): Promise<void> => {
  const clientBuildResult = await buildClient();
  Deno.writeTextFile("./browserClient.json", JSON.stringify(clientBuildResult));
};

await main();
