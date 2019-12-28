"use strict"
import amqplib from "amqplib";
import EventEmitter from "eventemitter3";
import uuid from "uuid";

interface MQDriverOptions {
    address: string;
    reqRes: boolean;
}

interface RequestObject {
    correlationId: string;
    responsePromise: Promise<object>;
    promiseResolve: Function;
    promiseReject: Function;
    requestQueue: string;
    reqParams: object
}

/*

ws verzija

 - skupno
  - narediti connection in channel

 - posiljanje requestov, ki cakajo na response
  - send request proti servicu
  - pending requests
  - direct receive queue
  - poiskati pending request in resolve promisa

 - service
  - subscribe na primeren exchange
  - consume messages
  - pognat whatever
  - poslat response (in ob tem ack requesta)


*/

export default class MQDriver extends EventEmitter{
    options: MQDriverOptions;

    private conn: amqplib.Connection;
    private channel: amqplib.Channel;

    private receiveDirectQueue: amqplib.Replies.AssertQueue;
    private receiveDirectConsume: amqplib.Replies.Consume;
    private pendingRequests: any; //TODO: use generated uuid as key in typescript???

    constructor(options: MQDriverOptions){
        super()
        this.options = options;
    }

    async init(){
        this.conn = await amqplib.connect(this.options.address);
        this.channel = await this.conn.createChannel();
        await this.createReceiveQueue();

    }

    private async createReceiveQueue(){
        const gotResponse = (msg: amqplib.ConsumeMessage) => {
            if(!this.pendingRequests[msg.properties.correlationId]){
                console.error("unknown correlationId. got response to unknown request", msg, this.pendingRequests);
                return;
            }
    
            const requestObj = this.pendingRequests[msg.properties.correlationId];
            delete this.pendingRequests[msg.properties.correlationId];
            let decodedResponse
            try {
                decodedResponse = msg.content.toJSON();
            }
            catch(e){
                console.error("failed to decode message content", msg);
            }
            
            requestObj.responsePromise.resolve(decodedResponse);
        }

        this.receiveDirectQueue = await this.channel.assertQueue('', {
            exclusive: true,
            durable: true
        })
        this.receiveDirectConsume = await this.channel.consume(this.receiveDirectQueue.queue, gotResponse, {})
    }

    async sendRequest(serviceName: string, reqParams: object){

        let promiseResolve, promiseReject
        let requestObj: RequestObject = {
            requestQueue: serviceName,//TODO: get proper queue name
            correlationId: uuid(),
            reqParams,
            responsePromise: new Promise((resolve, reject) => {
                promiseResolve = resolve;
                promiseReject = reject;
            }),
            promiseReject,
            promiseResolve
        }

        try{
            let ok = this.channel.publish(`s:${serviceName}`,"" , Buffer.from(JSON.stringify(reqParams)), {
                deliveryMode: true,
                timestamp: Date.now(),
                correlationId: requestObj.correlationId,
                replyTo: this.receiveDirectQueue.queue
            })
            if(!ok){
                console.log("publish returned false");
            }
        }
        catch (e) {
            console.error("channel publish error", e)
        }

        
        this.pendingRequests[requestObj.correlationId] = requestObj;

    }

}