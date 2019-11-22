const Web3 = require("web3");
const EventEmitter = require("eventemitter3");


module.exports = class Web3Manager extends EventEmitter{
    constructor(wsAddr){
        super();
        this.wsAddr = wsAddr;
        this.web3 = null;

        console.log("using ethereum ws address", wsAddr);

        this.connect();
    }

    connect() {
        console.log('connecting to Ethereum node...');
        let web3 = new Web3(new Web3.providers.WebsocketProvider(this.wsAddr));
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
        for (const event of ['end', 'connect', 'error', 'finish']){
            this.provider.removeAllListeners(event);
        }
        this.web3 = null;
        this.provider = null;
        this.emit('gethConnectionLost');
    }
}