const MongoClient = require('mongodb').MongoClient;
const fallbackUrl = "mongodb+srv://reader:XdYqrzG95gb3E65F@rso-9cwsn.mongodb.net/test?&w=majority";
const fallbackClient = new MongoClient(fallbackUrl, { useNewUrlParser: true });

const client = process.env.MONGO_URL ? new MongoClient(process.env.MONGO_URL, { useNewUrlParser: true }) : null;

client.connect(err => {
    const collection = client.db("test").collection("devices");
    // perform actions on the collection object
    client.close();
});

const findOneInClient = (client, query) => {

    const collection = client.db("test")
}

const fetchServiceFromClient = (client, serviceName) => {

}

const fetchExtensionFromClient = (client, extensionName) => {

}

module.exports = (serviceName) => {

}