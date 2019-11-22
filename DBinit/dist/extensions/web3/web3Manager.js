"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const web3_1 = __importDefault(require("web3"));
const eventemitter3_1 = __importDefault(require("eventemitter3"));
class Web3Manager extends eventemitter3_1.default {
    constructor(wsAddr) {
        super();
        this.wsAddr = wsAddr;
        this.web3 = null;
        console.log("using ethereum ws address", wsAddr);
        this.connect();
    }
    connect() {
        console.log('connecting to Ethereum node...');
        let web3 = new web3_1.default(new web3_1.default.providers.WebsocketProvider(this.wsAddr));
        let provider = web3.currentProvider;
        this.provider = provider;
        provider.on('end', () => {
            console.log('end');
            this.disconnect();
            setTimeout(this.connect, 5000);
        });
        provider.on('connect', () => {
            console.log('connected to Ethereum node');
            this.web3 = web3;
            this.emit('newWeb3', this.web3);
        });
        provider.on('error', () => {
            console.log('web3 connection error');
            this.disconnect();
            setTimeout(this.connect, 5000);
        });
        provider.on('finish', () => {
            console.log('finish', arguments);
            this.disconnect();
            setTimeout(this.connect, 5000);
        });
    }
    disconnect() {
        for (const event of ['end', 'connect', 'error', 'finish']) {
            this.provider.removeAllListeners(event);
        }
        this.web3 = null;
        this.provider = null;
        this.emit('gethConnectionLost');
    }
}
exports.default = Web3Manager;
//# sourceMappingURL=web3Manager.js.map