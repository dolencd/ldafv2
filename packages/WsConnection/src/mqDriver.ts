"use strict"
import amqplib from "amqplib";
import EventEmitter from "eventemitter3";
import * as BJSON from "json-buffer";
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
    typeCount: number,
    methods: Array<ServiceInfoMethod>
}

export interface ServiceInfoMethod {
    name: string,
    type: string,
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
        this.pendingRequests = {};
    }

    async init(){
        this.conn = await amqplib.connect(this.address);

        this.conn.on("close", () => {
            console.log("MQ conn close")
        })
        this.conn.on("error", (e) => {
            console.log("MQ conn error", e)
        })
        this.conn.on("blocked", (r) => {
            console.log("MQ conn blocked", r)
        })
        this.conn.on("unblocked", () => {
            console.log("MQ conn unblocked")
        })

        this.channel = await this.conn.createChannel();
        await this.channel.prefetch((this.options && this.options.prefetch) || 10);
        await this.createReceiveQueue();

        return this;
    }

    private async createReceiveQueue(){
        console.log("MQ creating receive queue")
        const gotResponse = (msg: amqplib.ConsumeMessage) => {
            if(!this.pendingRequests[msg.properties.correlationId]){
                console.error("unknown correlationId. got response to unknown request", msg, this.pendingRequests);
                return;
            }
    
            const requestObj = this.pendingRequests[msg.properties.correlationId];
            delete this.pendingRequests[msg.properties.correlationId];

            this.channel.ack(msg);

            if(msg.properties.type === "error"){
                requestObj.promiseReject(msg.content.toString);
            }
            requestObj.promiseResolve(msg.content);
        }

        this.receiveDirectQueue = await this.channel.assertQueue('', {
            exclusive: true,
            durable: true
        })
        this.receiveDirectConsume = await this.channel.consume(this.receiveDirectQueue.queue, gotResponse, {})
        console.log("MQ receive queue created", this.receiveDirectQueue.queue)
    }

    async sendRequest({serviceName, type, reqParams={}, options={}}: {serviceName: string, type: string, reqParams?: object, options?:object}){

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
            let ok = this.channel.sendToQueue(`s:${serviceName}`, Buffer.from(BJSON.stringify(reqParams)), {
                deliveryMode: true,
                timestamp: Date.now(),
                correlationId: requestObj.correlationId,
                replyTo: this.receiveDirectQueue.queue,
                persistent: true,
                type
            })
            if(!ok){
                console.log("publish returned false");
            }
        }
        catch (e) {
            console.error("channel publish error", e)
        }

        
        this.pendingRequests[requestObj.correlationId] = requestObj;
        console.log("MQ request sent", arguments, requestObj.correlationId)
        return requestObj.responsePromise

    }

    async queuesExists(queues: Array<string>) {
        const sacrificialChannel = await this.conn.createChannel();
        sacrificialChannel.on("error", (e) => {
            console.log("got error on sacrificial channel", e)
        })
        try {
            await Promise.all(queues.map((queue: string) => {
                return sacrificialChannel.checkQueue(queue);
            }))
            sacrificialChannel.close();
            return true;
        }
        catch(e) {
            if(e.code !== 404) throw e;
            return false;
        }
    }

    async getServiceInfo(serviceName: string){
        let res: Promise<Buffer> = await this.sendRequest({
            serviceName, 
            type: "info",
         });
         
        return BJSON.parse(res.toString());
    }

}