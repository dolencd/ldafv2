"use strict";
const MongoClient = require('mongodb').MongoClient;
const fs = require('fs-extra');
const bestzip = require("bestzip");
const path = require("path");
// Connection URL
const url = 'mongodb://localhost:27017';
// Database Name
const dbName = 'LDAF';
(async function () {
    const client = new MongoClient(url);
    try {
        await client.connect();
        console.log("Connected correctly to server");
        const db = client.db(dbName);
        const extensionsCollection = db.collection("extensions");
        const servicesCollection = db.collection("services");
        //TODO: run extension search and services search in paralel
        const extensionDirs = await fs.readdir("./extensions");
        for (let dirName of extensionDirs) {
            let dirPath = path.join(process.cwd(), "extensions", dirName);
            let indexPath = dirPath + "/index.js";
            let { name, dependencies } = require(indexPath);
            let foundDocument = (await extensionsCollection.find({ name }).limit(1).toArray())[0];
            if (foundDocument) {
                console.log("found document. continuing", dirName, name);
                continue;
            }
            ;
            let zippedExt = await zipFolder(dirPath);
            await fs.writeFile(`./${name}.zip`, zippedExt);
            extensionsCollection.insertOne({
                name,
                dependencies,
                zip: zippedExt
            });
            console.log("inserted extension", name);
        }
        const serviceDirs = await fs.readdir("./services");
        for (let dirName of serviceDirs) {
            let dirPath = path.join(process.cwd(), "services", dirName);
            let indexPath = dirPath + "/index.js";
            let { name, dependencies, extensions } = require(indexPath);
            let foundDocument = (await servicesCollection.find({ name }).limit(1).toArray())[0];
            if (foundDocument) {
                console.log("found document. continuing", dirName, name);
                continue;
            }
            ;
            let zippedSer = await zipFolder(dirPath);
            await fs.writeFile(`./${name}.zip`, zippedSer);
            servicesCollection.insertOne({
                name,
                dependencies,
                extensions,
                zip: zippedSer
            });
            console.log("inserted service", name);
        }
    }
    catch (err) {
        console.error(err);
    }
    // Close connection
    client.close();
})();
// const unzip = require("unzip");
async function zipFolder(folderPath) {
    const tmpPath = path.join(process.cwd(), "_tmp.zip");
    await bestzip({
        source: "./*",
        cwd: folderPath,
        destination: tmpPath
    });
    let outBuffer = await fs.readFile(tmpPath);
    await fs.unlink(tmpPath);
    return outBuffer;
}
//# sourceMappingURL=dbInit.js.map