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
            typeCount: serviceConfig.typeCount
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
            

            switch(msg.properties.type){
                case "info":
                    this._handleInfoCall(msg);
                    break;
                case "methodCall":
                    this._handleMethodCall(msg);
                    break;
                default:
                    console.error("got message of unknown type", msg)
            }
        
        }

        this.receiveQueue = await this.channel.assertQueue(`s:${this.serviceConfig.name}`, {
            exclusive: false,
            durable: true
        })
        this.receiveDirectConsume = await this.channel.consume(this.receiveQueue.queue, gotMessage, {
            noAck: false,
            exclusive: false
        })
    }

    private _handleInfoCall(msg: amqplib.Message) {
        //TODO: request validation. yup?
        this.channel.sendToQueue(msg.properties.replyTo, this.serviceInfoBuffer, {
            correlationId: msg.properties.correlationId,
            timestamp: Date.now()
        })
        this.channel.ack(msg);
    }

    private _handleMethodCall(msg: amqplib.Message) {
        //TODO: request validation. yup?
        this.emit("methodCall", {
            msg,
            content: msg.content || {},
            sendReply: (content: object) => {
                this.channel.sendToQueue(msg.properties.replyTo, Buffer.from(BJSON.stringify(content)), {
                    correlationId: msg.properties.correlationId,
                    timestamp: Date.now()
                })
                this.channel.ack(msg);
            }
        })
    }





}