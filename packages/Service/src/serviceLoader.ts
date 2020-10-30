import { ServiceConfig } from ".";
import execa from "execa";
import download from "download"
import {join} from "path";
import {ensureDir, pathExists, outputFile} from "fs-extra"

const packagesDirPath = join(process.cwd(), "packages");
const tmpDirPath = join(process.cwd(), "tmp")

export const installService = async (url: string): Promise<{serviceConfig: ServiceConfig, service: any, plugins: Array<any>}> => {
    await Promise.all([
        ensureDir(packagesDirPath),
        ensureDir(tmpDirPath)
    ])
    // const {serviceConfig: ServiceConfig, servicePackage=package} = await fetchPackageHttp(name, url);
    let _: any = await fetchPackageHttp("_service", url);
    console.log("HTTP fetch done", _)
    const serviceConfig: ServiceConfig = _.serviceConfig;
    const servicePackage: any = _.pkg;
    
    const installingPlugins = serviceConfig.plugins.map(async (pluginConfig) => {
        if(pluginConfig.src_npm) {
            return await fetchPackageNpm(pluginConfig.src_npm)
        }
        else if (pluginConfig.src_http) {
            return (await fetchPackageHttp(pluginConfig.name, pluginConfig.src_http)).pkg
        }
    })
    const plugins = await Promise.all(installingPlugins)
    return {
        serviceConfig,
        service: servicePackage,
        plugins
    }
}

const fetchPackageHttp = async (name: string, src_http: string): Promise<{serviceConfig?: ServiceConfig, pkg: any}> => {
    console.log("installing package from HTTP", name, src_http);
    try {
        //TODO: ensure files don't get overwritten
        const downloadFileName = join(tmpDirPath, name + ".tar.gz");
        const packageDir = join(packagesDirPath, name);
        
        const tarFile: Buffer = await download(src_http);
        console.log("package downloaded");
        await outputFile(downloadFileName, tarFile)
        await ensureDir(packageDir)
        const result_tar = await execa("tar", [
            "-xzf",
            downloadFileName,
            "--strip-components",
            "1",
            "--directory",
            packageDir
        ])

        if(result_tar.exitCode !== 0){
            throw result_tar;
        }

        const serviceConfigPath = join(packageDir,"config.json")

        console.log("HTTP package installed", name, src_http)

        const result_npm = await execa("npm", ["install"], {
            stdout: process.stdout,
            stderr: process.stderr
        });

        if(result_npm.exitCode !== 0){
            throw "HTTP failed to install dependencies" + result_npm;
        }

        const serviceConfig = (await pathExists(serviceConfigPath)) ? (await import(serviceConfigPath)) : null
        console.log("serviceCondfig", name, serviceConfig)
        const pkg = await import(packageDir);
        console.log("package", name, pkg)
        return {
            serviceConfig,
            pkg
        }
        
    }
    catch (e) {
        console.error("failed to install package via http", e)
        return;
    }
}

const fetchPackageNpm = async (src_npm: string): Promise<any> => {
    console.log("installing NPM package", src_npm)
    try {
        const result = await execa("npm", ["install", "--no-save", src_npm], {
            stdout: process.stdout,
            stderr: process.stderr
        });

        if(result.exitCode !== 0){
            throw "failed to install NPM packages" + result;
        }
        console.log("NPM package installed. Importing", src_npm)
        return await import(src_npm);
    }
    catch (e) {
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