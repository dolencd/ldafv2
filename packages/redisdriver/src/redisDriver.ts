import Redis from "ioredis";
import BJSON from "json-buffer";

export class RedisDriver {

    redis: Redis.Redis
    private host: string
    private port: number
    private name: string
    private prefix: string

    constructor({name, prefix}: {name?: string, prefix?: string}){
        this.host = process.env.REDIS_HOST || "localhost";
        this.port = parseInt(process.env.REDIS_PORT) || 6379;
        this.name = name;
        this.prefix = prefix ? prefix : `s:${name}`;

        console.log(`redis in service:${this.name} using host:${this.host} and port:${this.port}`);

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
            this.redis.on(name, (a: any,b: any) => {
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
        return `${this.prefix}:${key}`
    }

    async readData(key: string){
        let data = await this.redis.get(this.correctKey(key))
        return BJSON.parse(data)
    }

    async writeData(key: string, data: object){
        return this.redis.set(this.correctKey(key), BJSON.stringify(data));
    }

    async readDataGlobal(key: string){
        let data = await this.redis.get(key)
        return BJSON.parse(data)
    }

    async writeDataGlobal(key: string, data: object){
        return this.redis.set(key, BJSON.stringify(data));
    }

    async close(){
        return this.redis.disconnect();
    }
}