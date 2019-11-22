"use strict";
const jsonData = {
    name: "json",
};
module.exports = Object.assign({}, jsonData, { src: (toExtend) => {
        return class Json extends toExtend {
            constructor(config) {
                super(config);
                this.clg("json extension constructor");
            }
            incomingCall(callObj) {
                if (super.incomingCall)
                    super.incomingCall(callObj);
                callObj.params = JSON.parse(callObj.params);
            }
        };
    } });
//# sourceMappingURL=index.js.map