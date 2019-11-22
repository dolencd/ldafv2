const redis = require("redis");

const client = redis.createClient({

})

const events = ["ready","connect", "reconnect", "end", "error"]
events.map(s => client.on(s, 
        console.log.bind( null, "redisClient", s)
    )
)


client.set("k1", "k11", redis.print);
client.get("k1", redis.print);