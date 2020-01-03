const Redis = require("ioredis");


module.exports = class RedisDriver {
    constructor(){
        this.host = process.env.REDIS_HOST || "localhost";
        this.port = process.env.REDIS_PORT || 6379;

        console.log(`redis host:${this.host} port:${this.port}`);

        this.redis = new Redis({
            port: process.env.REDIS_PORT, 
            host: process.env.REDIS_HOST,
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
                console.log("redis " + name, a, b);
            })
        })
        
    }

    async readData(key){
        return this.redis.get(key)

    }

    async writeData(key, data){
        return this.redis.set(key, data);
    }

    async close(){
        return this.redis.disconnect();
    }
}