const data = {
    name: "messageEvent",
}
export default {
    ...data,
    src: (toExtend: any) => {
        return class Protobuf extends toExtend {
            constructor(config: any){
                super(config);
                this.clg("messageEvent extension constructor")


            }
            
            incomingCall(callObj: any){
                if(super.incomingCall) super.incomingCall(callObj);
                this.emit(callObj.method, callObj);
            }


        }
    }
}