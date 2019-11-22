module.exports = class Json {
    constructor(config){
        console.log("json extension constructor")

    }
    
    newRequest(event, context, callback){
        try {
            event.params = JSON.parse(event.encodedParams);
        }
        catch(e){
            console.error("failed to decode JSON", arguments);
        }
        return [event, context, callback]
    }
}