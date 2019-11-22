const eventemiter3 = require("eventemitter3");

function provideRedis(){
    if(process.env.TEST === "true"){
        console.log(
            "using mock redis. TESTING USE ONLY"
        );

        let Redis = require("ioredis-mock");
        return new Redis({
            showFriendlyErrorStack: true,
        })

    }

    //TODO: use yup to test inputs

    let Redis = require("ioredis");
    return new Redis({
        port: process.env.REDIS_PORT, 
        host: process.env.REDIS_HOST,
        password: process.env.REDIS_PASSWORD || null,
        showFriendlyErrorStack: true
        //TODO: redis options
    });

}

module.exports = class RedisDriver {
    constructor(){
        this.redis = provideRedis();
    }

    async readData(key){

        return this.redis.get(key)

    }

    async writeData(key, data){
        return this.redis.set(key, data);
    }
}