const http = require("http");

module.exports = function (RED) {
    function SendToDefiny(config) {
        console.log("in LowerCaseNode", process);
        RED.nodes.createNode(this, config);
        let node = this;
        node.on('input', function (msg) {
            http.get("https://narumincho.com", (res) => {
                res.on("data", (data) => {
                    console.log(data)
                })
            })
            console.log("in on.input", process);
            msg.payload = msg.payload.toLowerCase();
            node.send(msg);
        });
    }
    RED.nodes.registerType("send-to-definy", SendToDefiny);
}