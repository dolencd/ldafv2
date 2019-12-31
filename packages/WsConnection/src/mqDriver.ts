"use strict"
import amqplib from "amqplib";
import EventEmitter from "eventemitter3";
import uuid from "uuid";

interface MQDriverOptions {
    prefetch?: number;
}

interface RequestObject {
    correlationId: string;
    responsePromise: Promise<any>;
    promiseResolve: Function;
    promiseReject: Function;
    requestQueue: string;
    reqParams: object
}

export interface ServiceInfo {
    name: string,
    typeCount: number
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

export class MQDriver extends EventEmitter{
    options: MQDriverOptions;

    private conn: amqplib.Connection;
    private channel: amqplib.Channel;
    private address: string;

    private receiveDirectQueue: amqplib.Replies.AssertQueue;
    private receiveDirectConsume: amqplib.Replies.Consume;
    private pendingRequests: any; //TODO: use generated uuid as key in typescript???
    

    constructor(options?: MQDriverOptions){
        super()
        this.options = options;
        this.address = process.env.RABBITMQ_ADDRESS || "amqp://localhost"
    }

    async init(){
        this.conn = await amqplib.connect(this.address);
        this.channel = await this.conn.createChannel();
        await this.channel.prefetch(this.options.prefetch || 10);
        await this.createReceiveQueue();

        return this;
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
                decodedResponse = JSON.parse(msg.content.toString());
            }
            catch(e){
                console.error("failed to decode message content", msg);
            }
            
            if(decodedResponse.error){
                requestObj.promiseReject(decodedResponse.error);
            }
            else {
                requestObj.promiseResolve(decodedResponse);
            }
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
            let ok = this.channel.sendToQueue(`s:${serviceName}`, Buffer.from(JSON.stringify(reqParams)), {
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

        return requestObj.responsePromise

    }

    async getServiceInfo(serviceName: string){
        let res: ServiceInfo = await this.sendRequest(serviceName, {method: "info"});
        return res;
    }

}