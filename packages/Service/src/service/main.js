const updateValue = (event, context, callback) => {
    context.storedValue = event.params.value;
    callback(context);
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

    callback(context, {
        value: blockNumber
    });
}

module.exports = {
    updateValue,
    add,
    getBlockNumber
}