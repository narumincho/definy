import { Context, importVscode, WebviewPanel } from "./vscodeApi.ts";

const vscode = importVscode();

if (vscode === undefined) {
  throw new Error("VSCode 内で呼んでください");
}

export const activate = (context: Context) => {
  vscode.commands.registerCommand("definy.webview", () => {
    vscode.window.registerCustomEditorProvider(
      "definy.webview-test",
      {
        resolveCustomTextEditor: (textDocument, webviewPanel) => {
          updatePanel(webviewPanel, textDocument.getText());
        },
      },
    );
  });
};

export const deactivate = () => {
  console.log("無効化します");
};

const updatePanel = (panel: WebviewPanel, text: string) => {
  panel.title = "任意のタイトル!";
  panel.webview.html = `<!doctype html>
  <html lang="ja">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Cat Coding</title>
  </head>
  <body>
    任意のHTML を表示する WebView!!!
    <script type="module"> document.body.append(new Date().toString()); </script>
  </body>
  </html>`;
};
