import { ServiceConfig } from ".";
import execa from "execa";
import * as wget from "wget-improved";
import {join} from "path";
import {ensureDir, unlink} from "fs-extra"

const packagesDirPath = join(process.cwd(), "packages");
const tmpDirPath = join(process.cwd(), "tmp")

const installService = async (name: string, url: string) => {
    let _: any = await fetchPackageHttp(name, url);
    const serviceConfig: ServiceConfig = _.serviceConfig;
    const servicePackage = _.package;
}

const fetchService = async (serviceConfig: ServiceConfig ) => {

    try {
        

        if(serviceConfig.src_npm){

        }
        else {
            
            await Promise.all([
                ensureDir(packagesDirPath),
                ensureDir(tmpDirPath)
            ])

            if(serviceConfig.src_http){ 

            }
            // else if (serviceConfig.src_git){
            //TODO: add src_git
            // }
            else {
                console.error("Invalid serviceConfig. Source not specified correctly")
            }
        }
    }
    catch(e) {
        console.error("Error fetching service", e);
    }
}

const fetchPackageHttp = async (name: string, src_http: string,){
    try {
        const downloadFileName = join(tmpDirPath, name);
        const packageDir = join(packagesDirPath, name)
        const download = await wget.download(src_http, downloadFileName);
        download.on("error", (err) => {
            throw err
        })

        download.on("end", (output) => {
            console.log("package downloaded", output);
            const result = await execa("tar", [
                "-xz",
                "--file=" + downloadFileName, 
                "strip-components=1",
                "--directory=" + packageDir
            ])

            if(result.exitCode !== 0){
                throw result;
            }

            return {
                serviceConfig: await import(join(packageDir,"config.json")),
                package: await import(packageDir),
            }

        })
        
    }   
    catch (e: Error) {
        console.error("failed to install package via http", e)
        return;
    }
}

const fetchPackageNpm = async (src_npm: string){
    try {
        const result = await execa("npm", ["install", "--no-save", src_npm], {
            stdout: process.stdout,
            stderr: process.stderr
        });

        if(result.exitCode !== 0){
            throw "failed to install NPM packages" + result;
        }

        return await import(src_npm);
    }
    catch (e: Error) {
        console.error("failed to install package via http", e)
        return;
    }
}


// import * as execa from "execa";
// import {join} from "path";
// import fetch from "node-fetch";
// import {writeFile, unlink} from "fs-extra";
// import * as isBase64 from "is-base64";

// const tmpFilePath = join(process.cwd(), "_tmp.zip");
// const EXTENSIONS_DIR = join(process.cwd(), "extensions");
// const SERVICE_DIR = join(process.cwd(), "service");

// interface extension {
//     src: Buffer,
//     name: string,
//     version: string
// }


// const unzipBase64ToFolder = async (base64: string, folderPath: string) => {
//     try{
//         let zipFile = Buffer.from(base64, "base64");
//         let hextest = /[0-9A-Fa-f]{6}/g;
//         if(Buffer.isBuffer(base64)){
//             zipFile = base64;
//         }
//         else if(isBase64(base64)){
//             zipFile = Buffer.from(base64, "base64");
//         }
//         else if(hextest.test(base64)){
//             zipFile = Buffer.from(base64, "hex")
//         }
//         else {
//             console.error("invalid input format in unzip", base64);
//             return;
//         }


//         await writeFile(tmpFilePath, zipFile)

//         await execa ("unzip", [tmpFilePath, "-d", folderPath], {
//             stderr: process.stderr,
//             stdout: process.stdout
//         })

//         await unlink(tmpFilePath);
//     }
//     catch (e){
//         console.error(e);
//         return e;
//     }
//     return false;
// }

// export default async (serviceName: string) => {
    
    
//     const serviceInfoResponse = await fetch(`http://localhost:3000/service/${serviceName}`)
    
//     if(!serviceInfoResponse.ok){
//         console.error("failed to fetch service", serviceName);
//         return;
//     }
//     console.log("got service info")
    

//     const serviceInfo = await serviceInfoResponse.json();

//     await unzipBase64ToFolder(serviceInfo.zip, SERVICE_DIR);


//     const userServiceFile = require(join(SERVICE_DIR, "index.js"));
//     const extensions = serviceInfo.extensions.map(async (extension: string) => {

//         const extensionInfoResponse = await fetch(`http://localhost:3000/extension/${extension}`);
//         const extensionInfo = await extensionInfoResponse.json();

//         await unzipBase64ToFolder(extensionInfo.zip, join(EXTENSIONS_DIR, extension));

//         let out = require(join(EXTENSIONS_DIR, extension, "index"));
//         if(out.name !== extension){
//             console.warn("extension has invalid name", out.name, extension);
//         }

//         return out;
//     })

//     console.log("using extensions", extensions.map((extension: string) => extension.name))

//     const dependencies = [].concat.apply((userServiceFile.dependencies || []),
//         extensions.map((ext) => {
//             return (ext.dependencies || [])
//         })
//     );
    

//     const dedupedDependencies = dependencies.reduce((arr, newDep) => {
//         if (!newDep.name) {
//             console.error("trying to install dependency without name", newDep);
//             return arr;
//         }

//         let existingDependency = arr.find((e) => {
//             e.name === newDep.name //TODO: handle different versions
//         })
//         if(!existingDependency) {
//             arr.push(newDep);
//         }
//         return arr
//     }, [])

//     console.log("using dependencies", dedupedDependencies.map((dependency: string) => dependency.name))

//     const dependencyDescriptors = dedupedDependencies.map(({name, version}: {name: string, version: string}) => {
//         if(version) return `${name}@${version}`;
//         return name;
//     })

//     const result = await execa("npm", [].concat.apply(["install", "--no-save"],dependencyDescriptors), {
//         stdout: process.stdout,
//         stderr: process.stderr
//     });

//     if(result.exitCode !== 0){
//         console.error("failed to install NPM packages", result);
//         return;
//     }

//     console.log("installed dependencies");

//     const ServiceBaseWithExtensions = extensions.reduce((old: string, ext: string) => {
//         return ext.src(old);
//     }, ServiceBase);

//     return ServiceBaseWithExtensions
    
    

// }