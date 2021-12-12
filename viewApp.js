"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.start = void 0;
const start = (option) => {
    /**
     * applyViewをする前に事前に実行する必要あり
     *
     * イベントのコールバックの関数の作成と, メッセージの登録をするオブジェクトを作成する.
     */
    const createPatchState = () => {
        let clickMessageDataMap = new Map();
        let changeMessageDataMap = new Map();
        let inputMessageDataMap = new Map();
        return {
            clickEventHandler: (path, mouseEvent) => {
                const messageData = clickMessageDataMap.get(path);
                console.log("クリックを検知した!", path, mouseEvent, messageData);
                if (messageData === undefined) {
                    return;
                }
                if (messageData.stopPropagation) {
                    mouseEvent.stopPropagation();
                }
                if (typeof messageData.url === "string") {
                    history.pushState(undefined, "", messageData.url);
                }
                pushMessageList(messageData.message);
            },
            changeEventHandler: (path) => {
                const messageData = changeMessageDataMap.get(path);
                if (messageData === undefined) {
                    return;
                }
                pushMessageList(messageData);
            },
            inputEventHandler: (path, inputEvent) => {
                const messageData = inputMessageDataMap.get(path);
                if (messageData === undefined) {
                    return;
                }
                pushMessageList(messageData(inputEvent.target.value));
            },
            setMessageDataMap: (newMessageMap) => {
                clickMessageDataMap = new Map(newMessageMap.click.map((e) => [e.path, e.messageData]));
                changeMessageDataMap = new Map(newMessageMap.change.map((e) => [e.path, e.messageData]));
                inputMessageDataMap = new Map(newMessageMap.input.map((e) => [e.path, e.messageData]));
            },
        };
    };
    /**
     * メッセージキューにメッセージを追加
     */
    const pushMessageList = (message) => {
        messageList.push(message);
    };
    /**
     * メインループ!
     */
    const loop = () => {
        requestAnimationFrame(loop);
        if (messageList.length === 0) {
            return;
        }
        console.log("handle message!", [...messageList]);
        while (true) {
            const message = messageList.shift();
            if (message === undefined) {
                break;
            }
            state = option.update(message, state);
        }
        const newView = option.stateToView(state);
        console.log({ state, newView });
        oldView = newView;
        option.renderView(newView, patchState);
    };
    const stateAndMessageList = option.initStateAndMessageList;
    let state = option.initStateAndMessageList.state;
    /**
     * メッセージのキュー
     */
    const messageList = [
        ...option.initStateAndMessageList.messageList,
    ];
    let oldView = option.stateToView(stateAndMessageList.state);
    const patchState = createPatchState();
    option.renderView(oldView, patchState);
    loop();
    // ブラウザで戻るボタンを押したときのイベントを登録
    window.addEventListener("popstate", () => {
        pushMessageList(option.urlChangeMessageData(window.location.pathname + window.location.search));
    });
};
exports.start = start;
