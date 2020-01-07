"use strict"
import amqplib from "amqplib";
import EventEmitter from "eventemitter3";
import BJSON from "json-buffer";

import { ServiceConfig, ServiceInfo } from "./typeDefs";
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

export interface MQDriverOptions{
    prefetch: number
}

export class MQDriver extends EventEmitter{

    serviceInfoBuffer: Buffer
    options: MQDriverOptions
    serviceConfig: ServiceConfig
    address: string
    conn: amqplib.Connection
    channel: amqplib.Channel
    receiveQueue: amqplib.Replies.AssertQueue
    receiveDirectConsume: amqplib.Replies.Consume

    constructor(options: MQDriverOptions, serviceConfig: ServiceConfig){
        super()

        this.serviceInfoBuffer = Buffer.from(BJSON.stringify({
            name: serviceConfig.name,
            typeCount: serviceConfig.typeCount,
            methods: serviceConfig.methods.map(m => {
                return {
                    name: m.name,
                    typeCount: m.typeCount,
                    type: m.type
                }
            })
        }));
        this.options = options;
        this.serviceConfig = serviceConfig;
        this.address = process.env.RABBITMQ_ADDRESS || "amqp://localhost"

        if(typeof this.serviceConfig.name !== "string"){
            console.error("invalid serviceName", this.serviceConfig.name);
        }
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
        console.log("RabbitMQ connected");
        await this.channel.prefetch(this.options.prefetch || 10);
        await this.createReceiveQueue();
        console.log("RabbitMQ receive queue connected")
        return this;
    }

    async createReceiveQueue(){
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
        this.receiveQueue = await this.channel.assertQueue(`s:${this.serviceConfig.name}`, {
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
            console.error("attempted to call unknown method", msg, this.serviceConfig.methods);
            return;
        }

        //TODO: request validation. yup?
        
            this.emit("methodCall", 
                msg,
                methodName,
                (content: Buffer) => {
                    this.channel.sendToQueue(msg.properties.replyTo, content, {
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





}