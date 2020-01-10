import Web3 from "web3";
import {MethodCallEvent, ServiceConfig} from "../../typeDefs";

export interface Web3MethodCallEvent extends MethodCallEvent{
    params?: object
    web3?: Web3
}

let web3: Web3;

export const init = async (config: ServiceConfig) => {

    const pluginConfig = config.plugins.find(p => p.name === "web3");
    let address = "wss://ropsten.infura.io/ws";
    if(pluginConfig && pluginConfig.config && pluginConfig.config.wsAddr) address = pluginConfig.config.wsAddr
    if(process.env.GETH_WS_ADDR) address = process.env.GETH_WS_ADDR

    web3 = new Web3(new Web3.providers.WebsocketProvider(address));

}

export const applyPluginToMethodCall = (event: Web3MethodCallEvent, context: object, callback: (newCtx: object, responseBuffer: Buffer) => void) => {
    event.web3 = web3;
    
    return [
        event,
        context,
        callback
    ]
}