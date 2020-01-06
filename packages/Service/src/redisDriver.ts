import Redis from "ioredis";


export class RedisDriver {

    redis: Redis.Redis
    host: string
    port: number

    constructor(){
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

    async readData(key: string){
        return this.redis.get(key)
    }

    async writeData(key: string, data: string){
        return this.redis.set(key, data);
    }

    async close(){
        return this.redis.disconnect();
    }
}