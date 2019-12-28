"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const data = {
    name: "messageEvent",
};
exports.default = Object.assign({}, data, { src: (toExtend) => {
        return class Protobuf extends toExtend {
            constructor(config) {
                super(config);
                this.clg("messageEvent extension constructor");
            }
            incomingCall(callObj) {
                if (super.incomingCall)
                    super.incomingCall(callObj);
                this.emit(callObj.method, callObj);
            }
        };
    } });
//# sourceMappingURL=index.js.map