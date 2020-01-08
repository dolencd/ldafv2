import Redis from "ioredis";
import BJSON from "json-buffer";
import {ServiceConfig} from "./typeDefs"

export class RedisDriver {

    private redis: Redis.Redis
    private host: string
    private port: number
    private serviceConfig: ServiceConfig

    constructor(serviceConfig: ServiceConfig){
        this.serviceConfig = serviceConfig;
        this.host = process.env.REDIS_HOST || "localhost";
        this.port = parseInt(process.env.REDIS_PORT) || 6379;

        console.log(`redis host:${this.host} port:${this.port}`);

        this.redis = new Redis({
            port: this.port, 
            host: this.host,
            password: process.env.REDIS_PASSWORD || null,
            showFriendlyErrorStack: true
            //TODO: redis options
        });

        [
            "connect",
            "error",
            "close",
            "reconnecting",
            "end",
            "select"
        ].map((name) => {
            this.redis.on(name, (a,b) => {
                console.log("redis event " + name, a, b);
            })
        });

        // [
        //     "exit",
        //     "SIGINT"
        // ].map((signal) => {
        //     process.on(signal, () => {
        //         console.log("redis closing", signal)
        //         this.close();
        //     })
        // })
        
    }

    private correctKey(key: string) {
        return `s:${this.serviceConfig.name}:${key}`
    }

    async readData(key: string){
        let data = await this.redis.get(this.correctKey(key))
        return BJSON.parse(data)
    }

    async writeData(key: string, data: object){
        return this.redis.set(this.correctKey(key), BJSON.stringify(data));
    }

    async close(){
        return this.redis.disconnect();
    }
}