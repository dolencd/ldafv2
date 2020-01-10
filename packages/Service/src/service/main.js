const crypto = require("crypto");

const getHash = (data) => {
    return crypto.createHash("sha256").update(data).digest();
}

const updateValue = (event, context, callback) => {
    context.storedValue = event.params.value;
    callback(context);
}

const hashData = (event, context, callback) => {
    let {data, repetitions} = event.params;

    data = Buffer.from(data, "hex")
    for(let i = 0; i < repetitions; i++){
        data = getHash(data);
    }

    callback(null, {
        hash: data.toString("hex")
    })

}

const add = (event, context, callback) => {
    if(!context.storedValue){
        if(process.env.S_INITIAL_VALUE){
            context.storedValue = parseInt(process.env.S_INITIAL_VALUE);
        }
        else {
            context.storedValue = 0;
        }
    }

    callback(context, {
        value: context.storedValue + event.params.value
    });
}

const getBlockNumber = async (event, context, callback) => {
    let blockNumber = await event.web3.eth.getBlockNumber().catch(console.error);

    callback(null, {
        value: blockNumber
    });
}

module.exports = {
    hashData,
    updateValue,
    add,
    getBlockNumber
}