'use strict';

const {RedisDriver} = require('../dist/redisDriver');

describe('@ldafv2/redisdriver', () => {
    const redisDriver = new RedisDriver({name: "test"});
    test("writing to redis should not reject", async () => {


        const cb1 = jest.fn()

        redisDriver.redis.on("ready", cb1)
        

        const redisWriteDataPromise = redisDriver.writeData("abcd", 123)
        expect(redisWriteDataPromise).resolves.toBeDefined()

        await redisWriteDataPromise;
        expect(cb1).toHaveBeenCalled()

        const redisReadPromise = redisDriver.readData("abcd")
        expect(redisReadPromise).resolves.toBeDefined()

        expect(await redisReadPromise).toBe(123);

        // const cb2 = jest.fn()
        
        // redisDriver.redis.once("end", cb2);

        await redisDriver.close()
        

        await (require("events")).once(redisDriver.redis, "end")

        return true;

        
    })
});
