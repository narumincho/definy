"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.start = void 0;
const start = (option) => {
    /**
     * applyViewをする前に事前に実行する必要あり
     */
    const createPatchState = () => {
        let messageDataMap = new Map();
        return {
            clickEventHandler: (path, mouseEvent) => {
                const messageData = messageDataMap.get(path)?.onClick;
                if (messageData === undefined || messageData === null) {
                    return;
                }
                if (messageData.ignoreNewTab) {
                    /*
                     * リンクを
                     * Ctrlなどを押しながらクリックか,
                     * マウスの中ボタンでクリックした場合などは, ブラウザで新しいタブが開くので, ブラウザでページ推移をしない.
                     */
                    if (mouseEvent.ctrlKey ||
                        mouseEvent.metaKey ||
                        mouseEvent.shiftKey ||
                        mouseEvent.button !== 0) {
                        return;
                    }
                    mouseEvent.preventDefault();
                }
                if (messageData.stopPropagation) {
                    mouseEvent.stopPropagation();
                }
                pushMessageList(messageData.message);
            },
            changeEventHandler: (path) => {
                const messageData = messageDataMap.get(path)?.onChange;
                if (messageData === undefined || messageData === null) {
                    return;
                }
                pushMessageList(messageData);
            },
            inputEventHandler: (path, inputEvent) => {
                const messageData = messageDataMap.get(path)?.onInput;
                if (messageData === undefined || messageData === null) {
                    return;
                }
                pushMessageList(messageData(inputEvent.target.value));
            },
            setMessageDataMap: (newMapAsList) => {
                messageDataMap = new Map(newMapAsList.map((e) => [e.path, e.events]));
            },
        };
    };
    const pushMessageList = (message) => {
        messageList.push(message);
    };
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
    const messageList = [
        ...option.initStateAndMessageList.messageList,
    ];
    let oldView = option.stateToView(stateAndMessageList.state);
    const patchState = createPatchState();
    option.renderView(oldView, patchState);
    loop();
};
exports.start = start;
