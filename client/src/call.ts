"use strict";
interface Window {
    Elm: {
        Main: {
            init: (flags: {}) => ElmApp;
        };
    };
}

interface ElmApp {
    ports: {
        [key: string]: {
            subscribe: (arg: (value: any) => void) => void;
            send: (value: unknown) => void;
        };
    };
}

const elmAppElement = document.getElementById("elm-app") as HTMLElement;
elmAppElement.innerText = "プログラムの読み込み中……";
requestAnimationFrame(() => {
    const language = window.navigator.languages[0];
    const app = window.Elm.Main.init({
        node: elmAppElement,
        flags: { url: location.href, user: null, language: language }
    });
    let prevKeyEvent: KeyboardEvent;
    /* キー入力 */
    window.addEventListener("keydown", e => {
        prevKeyEvent = e;
        app.ports.keyPressed.send(e);
    });
    /*
        直前のキー入力のデフォルト動作を取り消す
        なぜかElmのコンパイルをデバッグモードでやるとキー動作を防げない
    */
    app.ports.preventDefaultBeforeKeyEvent.subscribe(_ => {
        console.log("直前のキー入力のデフォルト動作を取り消す", prevKeyEvent);
        if (prevKeyEvent.currentTarget === null) {
            console.log(
                "キーイベントの送信先オブジェクトがない!キー動作を無効化できないと思われる"
            );
        }
        prevKeyEvent.preventDefault();
        app.ports.keyPrevented.send(null);
    });
    /* テキストエリア(<textarea id="edit">)に値を設定(編集する前の初期設定用) */
    app.ports.setTextAreaValue.subscribe(text => {
        console.log(
            `テキストエリア(<textarea id="edit">)に${text}を設定しようとしている`
        );
        requestAnimationFrame(() => {
            const edit = document.getElementById("edit") as
                | HTMLInputElement
                | HTMLTextAreaElement
                | null;
            if (edit === null) {
                console.warn(
                    `テキストエリア(id=edit)への値(${text})の設定に失敗した`
                );
                return;
            }
            if (edit.value !== text) {
                edit.value = text;
            }
        });
    });
    /* テキストエリア(<textarea|input id="edit">)に強制的にフォーカスさせる */
    app.ports.focusTextArea.subscribe(e => {
        console.log(`<textarea id="eidt">にフォーカス`);
        requestAnimationFrame(() => {
            const editElement = document.getElementById("edit");
            if (editElement === null) {
                console.warn(`テキストエリア(id=edit)へのフォーカスに失敗した`);
                return;
            }
            editElement.focus();
        });
    });
    /* クリックイベントをキャプチャフェーズで登録する。複数登録しないように。
     */
    app.ports.setClickEventListenerInCapturePhase.subscribe(id => {
        requestAnimationFrame(() => {
            const element = document.getElementById(id);
            if (element === undefined) {
                console.log(`id=${id}の要素がない`);
                return;
            }
            console.log(`id=${id}にキャプチャフェーズのクリックイベントを追加`);
            if (element === null) {
                console.warn(`id=${id}へのキャプチャフェーズのクリックイベントを追加に失敗`);
                return;
            }
            element.addEventListener(
                "click",
                e => {
                    app.ports.fireClickEventInCapturePhase.send(id);
                },
                { capture: true }
            );
        });
    });
    /* 指定されたidの要素が表示されるようにスクロールさせる */
    app.ports.elementScrollIntoView.subscribe(id => {
        requestAnimationFrame(() => {
            const element = document.getElementById(id);
            if (element !== null) {
                element.scrollIntoView({ behavior: "smooth", block: "center" });
            }
        });
    });
    /* コンパイル結果(WASM)を実行 */
    app.ports.run.subscribe(compileResult => {
        WebAssembly.instantiate(new Uint8Array(compileResult.wasm)).then(
            result => {
                const exportFunc = result.instance.exports;
                const resultValue = exportFunc[0]();
                console.log(result);
                console.log("WASMの実行結果", resultValue);
                app.ports.runResult.send({
                    ref: compileResult.ref,
                    index: compileResult.index,
                    result: resultValue
                });
            }
        );
    });
    /* ウィンドウサイズを変えたら */
    const windowResizeSend = () => {
        app.ports.windowResize.send({
            width: window.innerWidth,
            height: window.innerHeight
        });
    };
    windowResizeSend();
    window.addEventListener("resize", windowResizeSend);
    const callApi = (
        query: string,
        callBack: (arg: { [key: string]: any }) => void
    ) => {
        fetch("/api", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                query: query,
                variables: null
            })
        })
            .then(response => response.json())
            .then(json => {
                callBack(json.data);
            });
    };

    const jumpPage = (url: string) => {
        requestAnimationFrame(() => {
            location.href = url;
        });
    };

    app.ports.logInWithGoogle.subscribe(() => {
        callApi(
            `
mutation {
getGoogleLogInUrl
}
`,
            data => {
                jumpPage(data.getGoogleLogInUrl);
            }
        );
    });

    app.ports.logInWithGitHub.subscribe(() => {
        callApi(
            `
mutation {
getGitHubLogInUrl
}
`,
            data => {
                jumpPage(data.getGitHubLogInUrl);
            }
        );
    });

    app.ports.logInWithTwitter.subscribe(() => {
        callApi(
            `
mutation {
getTwitterLogInUrl
}
`,
            data => {
                jumpPage(data.getTwitterLogInUrl);
            }
        );
    });

    app.ports.logInWithLine.subscribe(() => {
        callApi(
            `
mutation {
getLineLogInUrl
}
`,
            data => {
                jumpPage(data.getLineLogInUrl);
            }
        );
    });

    window.addEventListener("languagechange", () => {
        app.ports.changeLanguage.send(navigator.languages[0]);
    });
});
