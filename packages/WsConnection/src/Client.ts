import EventEmitter from "eventemitter3";
import uuid from "uuid";
import WebSocket from "ws";
import {ServerTranscoder, DecodedMessage} from "./ServerTranscoder";
import {IncomingMessage} from "http"

import {ServiceInfo} from "./mqDriver";

interface ServiceResponse {
    payload: Buffer,
    type: number
}

export interface MessageType {
    service: ServiceInfo,
    type: number,
    offset: number
}

export class Client extends EventEmitter {

    private _id: string;
    private _serverTranscoder: ServerTranscoder;
    private _socket: WebSocket;
    private _services: Array<ServiceInfo>


    constructor(socket: WebSocket, services: Array<ServiceInfo>, request: IncomingMessage){
        super()

        this._services = services;

        this._id = uuid();
        this._socket = socket;
        this._serverTranscoder = new ServerTranscoder();//TODO add typelen and seqlen settings to url
        this._socket.on("message", this._handleMessage);
        this._socket.on("close", () => {
            console.log("socket closed");
            this.emit("close");
        })
        this._socket.on("error", (err) => {
            console.error("WS error", err);
        })
    }

    private _handleMessage(rawMessage: Buffer){
        if(!rawMessage){
            console.log("got empty rawMessage");
            return;
        }

        let message: DecodedMessage;
        try {
            message = this._serverTranscoder.decode(rawMessage);
        }
        catch(e){
            console.error("failed to decode rawMessage", e);
            return;
        }
        console.log("got message", message);

        let messageType: MessageType;
        try {
            messageType = this._decodeTypeNumber(message.type);
        }
        catch(e){
            console.error(e, message, this._services, this);
            return;
        }
        
        this.emit("message", messageType.service, {
            payload: message.payload,
            type: messageType.type
        }, (response: ServiceResponse) => {
            try {
                let encodedResponse: Buffer = this._serverTranscoder.encode(response.type + messageType.offset, message.seq, response.payload);
                this._socket.send(encodedResponse);
            }
            catch(e){
                console.error("failed to encode and send respone", e);
                return;
            }
        })
        
    }

    private _decodeTypeNumber(_type: number){
        let type = _type;
        for(const service of this._services){
            if(service.typeCount < type){
                return {
                    service,
                    type,
                    offset: type - _type
                }
            }
            type -= service.typeCount;
        }
        throw "type out of bounds"
    }

    close() {
        console.log("closing client");
        this._socket.close();
    }

    get id(){
        return this._id;
    }
}