"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const data = {
    name: "web3",
    dependencies: [
        {
            name: "web3",
            version: "1.2.2"
        },
        {
            name: "eventemitter3"
        }
    ]
};
exports.default = Object.assign({}, data, { src: (toExtend) => {
        return class extends toExtend {
            constructor(config) {
                super(config);
                this.clg("web3 extension constructor");
                const Web3Manager = require("./web3Manager");
                this.web3Manager = new Web3Manager("wss://ropsten.infura.io/ws");
                this.web3Subs = {};
                this.web3Manager.on('gethConnectionLost', () => {
                    this.stopSubs();
                    this.web3 = null;
                });
                this.web3Manager.on('newWeb3', (web3) => {
                    this.web3 = web3;
                    this.init();
                });
            }
            stopSubs() {
                if (super.stopSubs)
                    super.stopSubs();
                for (const key of Object.keys(this.web3Subs)) {
                    this.web3Subs[key].unsubscribe((err, success) => {
                        if (err) {
                            this.clg('unsub error', key, err);
                        }
                        this.clg('unsub', key, success);
                        delete this.web3Subs[key];
                    });
                }
            }
        };
    } });
//# sourceMappingURL=index.js.map