import {MethodCallEvent} from "../../typeDefs"

interface JSONMethodCallEvent extends MethodCallEvent{
    params: object
}

export const applyPluginToapplyPluginToMethodCall = (event: JSONMethodCallEvent, context: object, callback: (responseBuffer: Buffer) => void) => {

    let decodedParams: object;
    try {
        decodedParams = JSON.parse(event.payload.toString());
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
        (responseObj: object) => {
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
