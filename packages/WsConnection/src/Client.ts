import EventEmitter from "eventemitter3";
import uuid from "uuid";
import WebSocket from "ws";
import {ServerTranscoder, DecodedMessage} from "./ServerTranscoder";
import {IncomingMessage} from "http"

import {ServiceInfo, ServiceInfoMethod} from "./mqDriver";

export interface MessageType {
    service: ServiceInfo,
    method: ServiceInfoMethod
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
        socket.on("message", this._handleMessage.bind(this));
        socket.on("close", () => {
            console.log("socket closed");
            this.emit("close");
        })
        socket.on("error", (err) => {
            console.error("WS error", err);
        })
    }

    private _handleMessage(rawMessage: Buffer|string){
        let messageToDecode: Buffer;
        if(Buffer.isBuffer(rawMessage)){
            messageToDecode = rawMessage;
        }
        else if (typeof rawMessage === "string"){
            messageToDecode = Buffer.from(rawMessage);
        }
        else {
            console.log("rawMessage not buffer or hex string", rawMessage);
            return;
        }

        let message: DecodedMessage;
        try {
            message = this._serverTranscoder.decode(messageToDecode);
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

        this.emit("methodCall", messageType, message.payload, (response: Buffer) => {
            try {
                let encodedResponse: Buffer = this._serverTranscoder.encode(message.type + 1, message.seq, response);
                this._socket.send(encodedResponse);
            }
            catch(e){
                console.error("failed to encode and send respone", e);
                return;
            }
        })
        
    }

    private _decodeTypeNumber(_type: number){
        let {service, type, offset} = this._getServiceFromTypeNumber(_type);

        let typesChecked = 0;

        for(const method of service.methods){
            if((typesChecked + method.typeCount) > type){
                return {
                    method,
                    service,
                    type,
                    offset: type - _type
                }
            }
            typesChecked += method.typeCount
        }
        throw "method type out of bounds"
    }

    private _getServiceFromTypeNumber(_type: number){
        
        let type = _type;
        for(const service of this._services){
            if(service.typeCount > type){
                return {
                    service,
                    type,
                    offset: type - _type
                }
            }
            type -= service.typeCount;
        }
        throw "service type out of bounds"
    }

    close() {
        console.log("closing client");
        this._socket.close();
    }

    get id(){
        return this._id;
    }
}