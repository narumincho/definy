"use strict";
const elmAppElement = document.getElementById("elm-app");
elmAppElement.innerText = "プログラムの読み込み中……";
requestAnimationFrame(() => {
    const language = window.navigator.languages[0];
    const app = window.Elm.Main.init({
        node: elmAppElement,
        flags: { url: location.href, user: null, language: language }
    });
    let prevKeyEvent;
    window.addEventListener("keydown", e => {
        prevKeyEvent = e;
        app.ports.keyPressed.send(e);
    });
    app.ports.preventDefaultBeforeKeyEvent.subscribe(_ => {
        console.log("直前のキー入力のデフォルト動作を取り消す", prevKeyEvent);
        if (prevKeyEvent.currentTarget === null) {
            console.log("キーイベントの送信先オブジェクトがない!キー動作を無効化できないと思われる");
        }
        prevKeyEvent.preventDefault();
        app.ports.keyPrevented.send(null);
    });
    app.ports.setTextAreaValue.subscribe(text => {
        console.log(`テキストエリア(<textarea id="edit">)に${text}を設定しようとしている`);
        requestAnimationFrame(() => {
            const edit = document.getElementById("edit");
            if (edit === null) {
                console.warn(`テキストエリア(id=edit)への値(${text})の設定に失敗した`);
                return;
            }
            if (edit.value !== text) {
                edit.value = text;
            }
        });
    });
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
            element.addEventListener("click", e => {
                app.ports.fireClickEventInCapturePhase.send(id);
            }, { capture: true });
        });
    });
    app.ports.elementScrollIntoView.subscribe(id => {
        requestAnimationFrame(() => {
            const element = document.getElementById(id);
            if (element !== null) {
                element.scrollIntoView({ behavior: "smooth", block: "center" });
            }
        });
    });
    app.ports.run.subscribe(compileResult => {
        WebAssembly.instantiate(new Uint8Array(compileResult.wasm)).then(result => {
            const exportFunc = result.instance.exports;
            const resultValue = exportFunc[0]();
            console.log(result);
            console.log("WASMの実行結果", resultValue);
            app.ports.runResult.send({
                ref: compileResult.ref,
                index: compileResult.index,
                result: resultValue
            });
        });
    });
    const windowResizeSend = () => {
        app.ports.windowResize.send({
            width: window.innerWidth,
            height: window.innerHeight
        });
    };
    windowResizeSend();
    window.addEventListener("resize", windowResizeSend);
    const callApi = (query, callBack) => {
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
    const jumpPage = (url) => {
        requestAnimationFrame(() => {
            location.href = url;
        });
    };
    app.ports.logInWithGoogle.subscribe(() => {
        callApi(`
mutation {
getGoogleLogInUrl
}
`, data => {
            jumpPage(data.getGoogleLogInUrl);
        });
    });
    app.ports.logInWithGitHub.subscribe(() => {
        callApi(`
mutation {
getGitHubLogInUrl
}
`, data => {
            jumpPage(data.getGitHubLogInUrl);
        });
    });
    app.ports.logInWithTwitter.subscribe(() => {
        callApi(`
mutation {
getTwitterLogInUrl
}
`, data => {
            jumpPage(data.getTwitterLogInUrl);
        });
    });
    app.ports.logInWithLine.subscribe(() => {
        callApi(`
mutation {
getLineLogInUrl
}
`, data => {
            jumpPage(data.getLineLogInUrl);
        });
    });
    window.addEventListener("languagechange", () => {
        app.ports.changeLanguage.send(navigator.languages[0]);
    });
});
