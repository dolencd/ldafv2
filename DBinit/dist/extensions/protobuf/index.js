"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const data = {
    name: "protobuf",
    dependencies: [
        {
            name: "protobufjs",
            version: "6"
        }
    ]
};
let projectRoot = require.main ? require.main.filename : __dirname;
exports.default = Object.assign({}, data, { src: (toExtend) => {
        return class Protobuf extends toExtend {
            constructor(config) {
                super(config);
                this.clg("protobuf extension constructor");
                const { join } = require("path");
                const protobufjs = require("protobufjs");
                let servicePath = join(projectRoot, "..", "service");
                this.protoRoots = this.config.protoFiles.map((protoFilePath) => {
                    return protobufjs.loadSync(join(servicePath, protoFilePath));
                });
                this.messageTypes.map((callType) => {
                    let schema = this._protobuf_searchRoots(callType.schemaName);
                    return Object.assign({ schema, encode: (obj) => schema.encode(schema.create(obj)).finish(), decode: (buf) => schema.decode(buf) }, callType);
                });
            }
            _protobuf_searchRoots(name) {
                this.protoRoots.map((root) => {
                    let schema = root.lookupType(name);
                    if (schema)
                        return schema;
                });
                return null;
            }
            incomingCall(callObj) {
                if (super.incomingCall)
                    super.incomingCall(callObj);
                callObj.params = callObj.messageType.decode(callObj.params);
            }
        };
    } });
//# sourceMappingURL=index.js.map