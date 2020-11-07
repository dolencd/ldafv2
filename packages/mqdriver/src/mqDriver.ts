"use strict"
import amqplib from "amqplib";
import EventEmitter from "eventemitter3";
import BJSON from "json-buffer";
import {v4 as uuid} from "uuid";
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

export interface RequestObject {
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

export interface MQDriverOptions{
    prefetch: number,
    directReceiveQueueName?: string
}

export interface Options {
    mqDriverOptions: MQDriverOptions,
    name?: string,
    serviceInfoBuffer?: Buffer
}

export class MQDriver extends EventEmitter{

    private serviceInfoBuffer: Buffer
    private options: MQDriverOptions
    private address: string
    private conn: amqplib.Connection
    private channel: amqplib.Channel
    private receiveQueue: amqplib.Replies.AssertQueue

    private receiveDirectQueue: amqplib.Replies.AssertQueue;
    private receiveDirectConsume: amqplib.Replies.Consume;
    private name: string;
    private pendingRequests: any;

    

    constructor(options: Options){
        super()

        if(!options.mqDriverOptions){
            console.error("No MQ options passed");
        }
        
        this.options = options.mqDriverOptions;
        this.name = options.name;
        this.address = process.env.RABBITMQ_ADDRESS || "amqp://localhost";

        this.pendingRequests = {};

        if(this.name){
            console.log("RabbitMQ Driver using name:", this.name)
            if(!options.serviceInfoBuffer){
                console.error("Provided service name, but no serviceInfoBuffer")
            }
            this.serviceInfoBuffer = options.serviceInfoBuffer
        }

        
    }

    async init(): Promise<MQDriver>{
        try {
            console.log("MQ connecting to address", this.address)
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
            console.log("RabbitMQ connected");
            await this.channel.prefetch(this.options.prefetch || 10);

            if(this.name) {
                console.log("RabbitMQ driver running for Service");
                await this.createServiceReceiveQueue();
            }
            else {
                console.log("RabbitMQ driver running for Connection")
                await this.createDirectReceiveQueue();
            }

            console.log("RabbitMQ receive queue connected")
        }
        catch(e){
            console.error("Error when initializing MQDriver", e)
            await new Promise((resolve, reject) => {
                setTimeout(resolve, 5000)
            })
            return await this.init()
        }
        return this;
    }

    private async createDirectReceiveQueue(){
        console.log("MQ creating receive queue")
        if(this.options.directReceiveQueueName) console.log("using specified directReceiveQueueName: " + this.options.directReceiveQueueName)
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

        this.receiveDirectQueue = await this.channel.assertQueue(this.options.directReceiveQueueName || '', {
            exclusive: this.options.directReceiveQueueName ? false : true,
            durable: true
        })
        this.receiveDirectConsume = await this.channel.consume(this.receiveDirectQueue.queue, gotResponse, {})
        console.log("MQ receive queue created", this.receiveDirectQueue.queue)
    }

    private async createServiceReceiveQueue(){
        const gotMessage = (msg: amqplib.Message) => {
            
            console.log("MQ message", msg)
            
            try {
                msg.content = BJSON.parse(msg.content.toString());
            }
            catch(e){
                console.error("MQ content decode error");
            }

            const [type, methodName] = msg.properties.type.split(":");
            

            switch(type){
                case "info":
                    this._handleInfoCall(msg);
                    break;
                case "methodCall":
                    this._handleMethodCall(msg, methodName);
                    break;
                default:
                    console.error("got message of unknown type", msg)
            }
        
        }

        console.log(1)
        this.receiveQueue = await this.channel.assertQueue(`s:${this.name}`, {
            exclusive: false,
            durable: true
        })
        console.log(2)
        this.receiveDirectConsume = await this.channel.consume(this.receiveQueue.queue, gotMessage, {
            noAck: false,
            exclusive: false
        })
        console.log(3)
    }

    private _handleInfoCall(msg: amqplib.Message) {
        //TODO: request validation. yup?
        this.channel.sendToQueue(msg.properties.replyTo, this.serviceInfoBuffer, {
            correlationId: msg.properties.correlationId,
            timestamp: Date.now()
        })
        this.channel.ack(msg);
    }

    private _handleMethodCall(msg: amqplib.Message, methodName: string) {

        if(!methodName){
            console.error("methodCall has no methodName", msg);
            return;
        }

        if(!msg.properties.correlationId) {
            this.emit("methodCall", 
                msg,
                methodName,
                () => {
                    this.channel.ack(msg);
                }
            )
            
            return;
        }

        //TODO: request validation. yup?
        
            this.emit("methodCall", 
                msg,
                methodName,
                (content: Buffer) => {
                    this.channel.sendToQueue(msg.properties.replyTo, content || Buffer.alloc(0), {
                        correlationId: msg.properties.correlationId,
                        timestamp: Date.now()
                    })
                    this.channel.ack(msg);
                },
                (error: string|object) => {

                    let toSend: Buffer;

                    if(typeof error === "string"){
                        toSend = Buffer.from(error);
                    }
                    else if (typeof error === "object"){
                        toSend = Buffer.from(BJSON.stringify(error));
                    }
                    else {
                        console.error("unknown type in method call errback")
                    }

                    this.channel.sendToQueue(msg.properties.replyTo, Buffer.from(toSend), {
                        correlationId: msg.properties.correlationId,
                        timestamp: Date.now(),
                        type: "error"
                    })
                    this.channel.ack(msg);
                }
            )
        
    }


    async sendRequestToService({serviceName, queueName, type, reqParams={}, options={}}: {serviceName?: string, queueName?:string, type: string, reqParams?: object, options?:amqplib.Options.Publish}){
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

        options.correlationId = requestObj.correlationId;
        options.replyTo = this.receiveDirectQueue.queue

        await this.sendMessage({serviceName, queueName, type, reqParams, options})
        this.pendingRequests[requestObj.correlationId] = requestObj;
        return requestObj.responsePromise;

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
        let res: Promise<Buffer> = await this.sendRequestToService({
            serviceName, 
            type: "info",
            options: {
                deliveryMode: true,
                persistent: true
            }
         });
         
        return BJSON.parse(res.toString());
    }


    async sendMessage({serviceName, queueName, type, reqParams={}, options={}}: {serviceName?: string, queueName?:string, type: string, reqParams?: object, options?:any}){
        

        options.timestamp = Date.now();
        options.type = type;

        const queue = queueName || `s:${serviceName}`

        try{
            let ok = this.channel.sendToQueue(queue, Buffer.from(BJSON.stringify(reqParams)), options)
            if(!ok){
                console.log("publish returned false");
            }
        }
        catch (e) {
            console.error("channel publish error", e)
        }

        console.log("MQ message sent", arguments)
    }


}