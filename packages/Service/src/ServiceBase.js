import ee3 from "eventemitter3";

export default class ServiceBase extends ee3{

    constructor(config){
        

        super();

        this.config = config;
        this.serviceName = config.name;
        this.clg = console.log.bind(null, this.serviceName);
        this.cle = console.error.bind(null, this.serviceName);

        this.connections = [];

        Object.assign(this, config);

    }

    newConnection(connection){

        if (!connection.services.includes(this.serviceName)) {
            this.cle('tried to add wrong connection', connection.conn.services);
            return;
        }
        this.clg('new connection');
        if (this.connections.length === 0){
            this.init();
        }
        this.connections.push(connection);

        connection.conn.on('message', (message) =>{
            let correctedMessageType = message.type - connection.offset;

            //this message was not intended for this service
            if(correctedMessageType < 0 || correctedMessageType >= this.typeCount) return;

            message.type = correctedMessageType;

            try {
                message.payload = this.messageTypeArray[message.type].decode(message.payload)
            }
            catch (e){
                this.cle('error in decode', e, message);
                return;
            }
            this.emit(
                this.messageTypeArray[message.type].name,
                message.payload,
                this.sendToConnection.bind(this, connection, message.seq)
            );
        });

        this.emit('newConnection', connection)
        // this.emit.apply(this,['newConnection'].concat(arguments))
    }

    init(){
        this.clg('init');
        this.emit('init');
    }

    stopSubs(){
        this.clg('stopSubs');
        this.emit('stopSubs');
    }

    sendToAllConnections(type, messageObj){
        let messageType = this.getMessageType(type, 0);//seq is always 0 when broadcasting
        let encodedMessage;
        try {
            encodedMessage = messageType.encode(messageObj);
        }
        catch (e){
            this.cle('error in encoding with schema',
                {
                    type,
                    messageType,
                    messageObj
                })
        }
        for (const connection of this.connections){
            //seq is always 0 when broadcasting
            connection.conn.send(messageType.number + connection.offset, 0, encodedMessage);
        }
    }
    
    sendToConnection(connection, seq, type, messageObj){
        let messageType = this.getMessageType(type, seq);
        let encodedMessage;
        try {
            encodedMessage = messageType.encode(messageObj);
        }
        catch (e){
            this.cle('error in encoding with schema',
                {
                    type,
                    messageType,
                    messageObj
                })
        }
        connection.conn.send(messageType.number + connection.offset, seq, encodedMessage);

        this.emit('sendToConnection', connection, type, seq, messageObj)
        
    }

    findMessageType({name, type}){
        return this.messageTypes.filter((messageType) => {
            return (name ? name === messageType.name : true) && (type ? type === messageType.name : true);
        })
    }

    getMessageType(type, seq){
        switch (typeof type) {
            case 'number':
                return this.messageTypeArray[type];
            case 'string':
                return this.messageTypeArray.find(
                    (element) =>
                    element.name === type &&
                    element.type === (seq === 0 ? 'psh' : 'res')
                );
            default:
                return type
        }
    }
}