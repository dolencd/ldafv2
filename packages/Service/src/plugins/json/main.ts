module.exports = {
    applyPluginToapplyPluginToMethodCall: (event, context, callback) => {

        let decodedParams;

        try {
            decodedParams = JSON.parse(event.bufferParams.toString());
        }
        catch(e){
            console.error("failed to decode json", e)
        }

        return [
            {
                ...event,
                params: decodedParams 
            },
            context,
            (responseObj) => {
                let encodedParams;
                try {
                    encodedParams = Buffer.from(JSON.stringify(responseObj));
                }
                catch(e){
                    console.error("failed to encode json", e)
                }

                callback(encodedParams);
            }
        ]
    }
}