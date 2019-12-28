(async () => {


    const MongoClient = require('mongodb').MongoClient;
    // Connection URL
    const url: string = process.env.MONGO_URL;
    
    // Database Name
    const dbName: string = 'LDAF';

    const client = new MongoClient(url);

    await client.connect();
    console.log("Connected correctly to server");

    const db = client.db(dbName);
    const extensionsCollection = db.collection("extensions");
    const servicesCollection = db.collection("services");


    const Koa = require('koa'),
        app = new Koa(),
        router = require('koa-router')(),
        // controller = require('./controller'),
        cors = require('koa2-cors');


    app.use(cors());

    router.get('/extension/:name', async (ctx: any) => {
            try {
                const {name} = ctx.params;

                const extension = (await extensionsCollection.find({name}).limit(1).toArray())[0]

                ctx.status = 200;
                ctx.body = JSON.stringify(extension)
            }
            catch (e) {
                console.error(e);
                ctx.status = 400;
                ctx.body = e.message || e;
            }
        }
    );

    router.get('/service/:name', async (ctx: any) => {
        try {
            const {name} = ctx.params;

            const service = (await servicesCollection.find({name}).limit(1).toArray())[0]

            ctx.status = 200;
            ctx.body = JSON.stringify(service)
        }
        catch (e) {
            console.error(e);
            ctx.status = 400;
            ctx.body = e.message || e;
        }
    }
);

    app.use(router.routes());


    let port = 3000;
    app.listen(port);
    console.log('started on port', port);
})()