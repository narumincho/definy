console.log("run main.js", process)

module.exports = function (RED) {
    function LowerCaseNode(config) {
        console.log("in LowerCaseNode", process);
        RED.nodes.createNode(this, config);
        let node = this;
        node.on('input', function (msg) {
            console.log("in on.input", process);
            msg.payload = msg.payload.toLowerCase();
            node.send(msg);
        });
    }
    RED.nodes.registerType("lower-case", LowerCaseNode);
}