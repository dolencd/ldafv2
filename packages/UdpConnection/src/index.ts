import {MQDriver} from "@ldafv2/mqdriver";
import {RedisDriver} from "@ldafv2/redisdriver"
import {createSocket as dgramCreateSocket} from "dgram";

export interface ServiceInfoMethod {
    name: string;
    type: string;
    typeCount: number;
}

export interface ServiceInfo {
    name: string;
    typeCount: number;
    methods: Array<ServiceInfoMethod>;
}

export interface MessageType {
    service: ServiceInfo,
    method: ServiceInfoMethod
    type: number,
    offset: number
}

const udpPort = Number.parseInt(process.env.UDP_PORT) || 41234
const clients: { [k: string]: object } = {}

const main = async () => {

    if(!process.env.UDP_FORWARDING_SERVICE) {
        throw new Error("No forwarding service specified UDP_FORWARDING_SERVICE=serviceName")
    }

    const redisDriver = new RedisDriver({
        name: "udpConnection",
        prefix: "c:udp"
    });

    const mqDriver = await (new MQDriver({
        type: "StatelessConnection",
        name: "udp",
        mqOptions: {
            prefetch: 10,
            address: process.env.RABBITMQ_ADDRESS
        }
    })).init();
    
    const server = dgramCreateSocket('udp4');

    server.on('error', (err) => {
        console.error(`server error:\n${err.stack}`);
        server.close();
        process.exit(1);
    });

    server.on('listening', () => {
        const address = server.address();
        console.log(`server listening ${address.address}:${address.port}`);
        console.log(`forwarding service set to: ${process.env.UDP_FORWARDING_SERVICE}`)
    });

    server.on('message', async (msg, rinfo) => {
        if(msg.length < 1) {
            console.error(`message too small ${rinfo.address}:${rinfo.port}`)
        }
        let smallId = msg.readUInt8()
        console.log(`server got: ${msg} from ${rinfo.address}:${rinfo.port} with smallId:${smallId}`);
        if(smallId === 0 || !(await redisDriver.readData("" + smallId))){

            function getRandomInteger(min: number, max: number) {
                return Math.floor(Math.random() * (max - min) + min);
            }

            for(let i = 1; i++; i <= 50) { //try up to X times
                let intToTry = getRandomInteger(1, 255)
                let targetInfo = await redisDriver.readData("" + intToTry)
                if(targetInfo) continue;
                smallId = intToTry;
                await redisDriver.writeData("" + intToTry, {ip: rinfo.address, port: rinfo.port})
                break;
            }

            if(smallId === 0){
                console.error("No free smallId fount. can't accept new connection")
                return;
            }
        }

        //at this point, the smallId should be valid
        mqDriver.sendMessage({
            serviceName: process.env.UDP_FORWARDING_SERVICE,
            reqParams: msg.slice(1),
            type: "methodCall:handleMessage",
            options: {
                appId: "" + smallId,
                correlationId: "" + smallId,
                replyTo: "c:udp",//TODO: move more of this logic to mqDriver
                deliveryMode: true,
                persistent: true
            }
        })

    });
    mqDriver.on("responseToSend", async ({corr, message, ack}: {corr: string, message: Buffer, ack: () => void}) => {
        const responseTarget = await redisDriver.readData(corr)
        if(!responseTarget){
            console.error("UDP received response from MQ, but has no response target address. ignoring it.");
            ack()
        }

        server.send(message, responseTarget.port, responseTarget.address, (err) => {
            if(err) {
                console.error("failed to send response", err);
                return;
            }
            ack()
        })
    })
    
    server.bind(udpPort);
}

main();