const Web3Manager = require("./web3Manager");
module.exports = class Web3Ext {
            constructor(config){
                this.wsAddr = config.wsAddr;
                this.clg("web3 extension constructor")
                
                if(!this.wsAddr) {
                    console.error("No Geth WS address specified in Web3 extension")
                }
                
                this.web3Manager = new Web3Manager(this.wsAddr);

                this.web3Manager.on('gethConnectionLost', () => {
                    this.stopSubs()
                    this.web3 = null;
                });
                this.web3Manager.on('newWeb3', (web3) => {
                    this.web3 = web3;
                    this.init();
                });
            }

            newRequest(event, context, callback){
                context.web3 = this.web3;
                return [event, context, callback];
            }
        }
    }
}