console.log("start")
const assert = require("assert");

process.env.TEST = true;

const testRedis = async () => {

    console.log(process.env.TEST)
    assert.equal(process.env.TEST , "true", "TEST env variable should be true when running tests");

    //TEST REDIS DRIVER
    const RedisDriver = require("../src/redisDriver")
    // assert.equal(typeof RedisDriver, "object", "RedisDriver must return object");
    const redisDriver = new RedisDriver();

    const redisWriteDataPromise = redisDriver.writeData("abcd", 123)
    assert.doesNotReject(redisWriteDataPromise, "writing to redis must not reject");
    
    await redisWriteDataPromise;

    const redisReadPromise = redisDriver.readData("abcd")
    assert.doesNotReject(redisReadPromise, "reading from redis must not reject");

    assert.equal(await redisReadPromise, 123, "value read from redis is not the same as was written");

}



const test = async () => {
    console.log("testing redis")
    await testRedis()
    console.log("redis test complete")

    console.log("all tests complete")
    return true;
};

test();