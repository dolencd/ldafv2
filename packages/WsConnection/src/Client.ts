import EventEmitter from "eventemitter3";
import uuid from "uuid";
import WebSocket from "ws";
import ServerTranscoder from "./ServerTranscoder";
import {IncomingMessage} from "http"


export class Client extends EventEmitter {

    private _id: string;
    private _serverTranscoder: ServerTranscoder;
    private _socket: WebSocket;
    private _services: Array<string>;


    constructor(socket: WebSocket, request: IncomingMessage){
        super()

        

        this._id = uuid();
        this._socket = socket;
        this._serverTranscoder = new ServerTranscoder();//TODO add typelen and seqlen settings to url
        this._socket.on("message", this._handleMessage);
    }

    private _handleMessage(rawMessage: Buffer){
        if(!rawMessage){
            console.log("got empty rawMessage");
            return;
        }

        let message;
        try {
            message = this._serverTranscoder.decode(rawMessage);
        }
        catch(e){
            console.error("failed to decode rawMessage", e);
            return;
        }


        
    }

    get id(){
        return this._id;
    }
}