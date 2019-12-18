"use strict"
import amqplib from "amqplib";
import EventEmitter from "eventemitter3";
import uuid from "uuid";

interface MQDriverOptions {
    address: string;
    
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


    }

    private async createReceiveQueue(){
        this.receiveDirectQueue = await this.channel.assertQueue('', {
            exclusive: true,
            durable: true
        })
        this.receiveDirectConsume = await this.channel.consume(this.receiveDirectQueue.queue, this.gotResponse, {})
    }

    private gotResponse(msg: amqplib.ConsumeMessage){
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
    
}