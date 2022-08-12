import * as fs from "fs-extra";

const writeFirebaseJson = async (): Promise<void> => {
  console.log("firebase.json を出力します....");
  const path = "./distribution/definy/firebase.json";
  await fs.ensureFile(path);
  await fs.writeFile(
    path,
    JSON.stringify({
      firestore: { rules: "./firestore.rules" },
      storage: { rules: "./storage.rules" },
      hosting: {
        trailingSlash: false,
        rewrites: [
          { source: "/api/**", function: "api" },
          { source: "/pngFile/**", function: "pngFile" },
          { source: "**", function: "html" },
        ],
        cleanUrls: true,
      },
      emulators: {
        firestore: { port: 8080 },
        hosting: { port: 2520 },
        storage: { port: 9199 },
        ui: { enabled: true },
      },
    })
  );
  console.log(path + " 出力に成功しました");
};

const writePackageJson = async (): Promise<void> => {
  const path = "./distribution/definy/functions/package.json";
  console.log(path + " を出力します....");
  await fs.ensureFile(path);
  await fs.writeFile(
    path,
    JSON.stringify({
      name: "definy-functions",
      version: "1.0.0",
      description: "definy in Cloud Functions for Firebase",
      repository: {
        url: "git+https://github.com/narumincho/definy.git",
        type: "git",
      },
      license: "MIT",
      homepage: "https://github.com/narumincho/definy",
      author: "narumincho",
      engines: { node: "16" },
      dependencies: {
        axios: "0.27.2",
        "firebase-admin": "11.0.0",
        "firebase-functions": "3.22.0",
        "fs-extra": "10.1.0",
        jimp: "0.16.1",
        jsonwebtoken: "8.5.1",
        "sha256-uint8array": "0.10.3",
        next: "12.2.5",
      },
      main: "./functions/main.js",
    })
  );
  console.log(path + " 出力に成功しました");
};

const main = async (): Promise<void> => {
  await Promise.all([writeFirebaseJson(), writePackageJson()]);
};

main();
