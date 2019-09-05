interface Window {
    Elm: {
        Main: {
            init: (flags: {}) => ElmApp;
        };
    };
}
type SubForElmCmd<T> = {
    subscribe: (arg: (value: T) => void) => void;
};

type CmdForElmSub<T> = {
    send: (value: T) => void;
};

interface ElmApp {
    ports: {
        setTextAreaValue: SubForElmCmd<string>;
        setClickEventListenerInCapturePhase: SubForElmCmd<string>;
        focusTextArea: SubForElmCmd<null>;
        preventDefaultBeforeKeyEvent: SubForElmCmd<null>;
        elementScrollIntoView: SubForElmCmd<string>;
        logInWithGoogle: SubForElmCmd<null>;
        logInWithGitHub: SubForElmCmd<null>;
        logInWithLine: SubForElmCmd<null>;
        requestAccessToken: SubForElmCmd<null>;
        keyPressed: CmdForElmSub<KeyboardEvent>;
        keyPrevented: CmdForElmSub<null>;
        windowResize: CmdForElmSub<{ width: number; height: number }>;
        responseAccessToken: CmdForElmSub<string | null>;
        fireClickEventInCapturePhase: CmdForElmSub<string>;
        changeLanguage: CmdForElmSub<string>;
    };
}

requestAnimationFrame(() => {
    const language = window.navigator.languages[0];
    const app = window.Elm.Main.init({
        flags: { language: language }
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
                console.warn(
                    `id=${id}へのキャプチャフェーズのクリックイベントを追加に失敗`
                );
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
    /* ウィンドウサイズを変えたら */
    const windowResizeSend = () => {
        app.ports.windowResize.send({
            width: innerWidth,
            height: innerHeight
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

    app.ports.requestAccessToken.subscribe(() => {
        const userDBRequest: IDBOpenDBRequest = indexedDB.open("user", 1);

        userDBRequest.onupgradeneeded = event => {
            console.log("ユーザーデータのDBが更新された");
            const target = event.target as IDBOpenDBRequest;
            const db = target.result;
            db.createObjectStore("accessToken", {});
        };

        userDBRequest.onsuccess = event => {
            console.log("ユーザーデータのDBに接続成功!");
            const target = event.target as IDBOpenDBRequest;
            const db = target.result;
            console.log("db in success", db);
            const transaction = db.transaction("accessToken", "readonly");
            transaction.oncomplete = event => {
                console.log("トランザクションが成功した");
                db.close();
            };
            transaction.onerror = event => {
                console.log("トランザクションが失敗した");
                db.close();
            };
            const getRequest = transaction
                .objectStore("accessToken")
                .get("lastLogInUser");
            getRequest.onsuccess = event => {
                console.log("読み込み完了!");
                const request = event.target as IDBRequest;
                if (request.result === undefined) {
                    app.ports.responseAccessToken.send("");
                    return;
                }
                if (typeof request.result === "string") {
                    app.ports.responseAccessToken.send(request.result);
                    return;
                }
                app.ports.responseAccessToken.send("error");
            };
            getRequest.onerror = event => {
                console.log("読み込み失敗");
                app.ports.responseAccessToken.send("error");
            };
        };

        userDBRequest.onerror = event => {
            console.log("ユーザーデータのDBに接続できなかった");
        };
    });

    window.addEventListener("languagechange", () => {
        app.ports.changeLanguage.send(navigator.languages[0]);
    });
});
