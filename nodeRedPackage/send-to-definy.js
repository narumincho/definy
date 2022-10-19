const { request } = require("undici");

// Node.js 内で動作
module.exports = function (RED) {
    function SendToDefiny(config) {
        RED.nodes.createNode(this, config);
        let node = this;
        node.on('input', function (msg) {
            request('https://narumincho.com').then((response) => {
                return response.body.text()
            }).then((html) => {
                const payload = msg.payload.toLowerCase();
                node.send({ payload: html });
            })
        });
    }
    RED.nodes.registerType("send-to-definy", SendToDefiny);
}