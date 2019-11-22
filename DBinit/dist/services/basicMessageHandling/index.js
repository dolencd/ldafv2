"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const data = {
    name: "basicMessageHandling",
    extensions: [
        "protobuf",
        "messageEvent"
    ],
    protoFiles: [
        "./basicMessageHandling.proto"
    ],
    messageTypes: [
        {
            name: 'add',
            type: 'req',
            schemaName: "callAdd"
        },
        {
            name: 'add',
            type: 'res',
            schemaName: "returnAdd"
        }
    ]
};
exports.default = Object.assign({}, data, { src: (toExtend) => {
        return class extends toExtend {
            constructor() {
                super(data);
                this.clg("basic message handling constructor");
                this.on("add", (callObj) => {
                });
            }
        };
    } });
//# sourceMappingURL=index.js.map