const updateValue = (event, context, callback) => {
    context.initialValue = event.params.value;
}

const add = (event, context, callback) => {
    if(!context.initialValue){
        if(process.env.S_INITIAL_VALUE){
            context.initialValue = parseInt(process.env.S_INITIAL_VALUE);
        }
        else {
            context.initialValue = 0;
        }
    }

    callback({
        value: context.initialValue + event.params.value
    });
}

module.exports = {
    updateValue,
    add
}