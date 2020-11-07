import { ServiceConfig } from ".";
import execa from "execa";
import download from "download"
import {join} from "path";
import {ensureDir, outputFile, unlink} from "fs-extra"
import simpleGit, { SimpleGit, SimpleGitOptions } from 'simple-git';

const packagesDirPath = join(process.cwd(), "packages");
const tmpDirPath = join(process.cwd(), "tmp")

export const installService = async (): Promise<{serviceConfig: ServiceConfig, service: any, plugins: any}> => {
    await Promise.all([
        ensureDir(packagesDirPath),
        ensureDir(tmpDirPath)
    ])

    let packageDir: string;
    if(process.env.SRC_HTTP) {
        packageDir = await fetchPackageHttp("_service", process.env.SRC_HTTP);
    }
    else if (process.env.SRC_GIT) {
        packageDir = await fetchPackageGit("_service", process.env.SRC_GIT);
    }
    else {
        throw new Error("Service SRC not specified. Either SRC_HTTP or SRC_GIT environment variable must be used");
    }
    console.log("main package downloaded into", packageDir)
    const serviceConfig = await import(join(packageDir,"config.json"))
    console.log("serviceCondfig", serviceConfig)

    const toReturn = await Promise.all([
        installDepsAndReturnPackage(packageDir),
        (async () => {
            const plugins = await installPlugins(serviceConfig);
            console.log("test", plugins)
            await Promise.all(plugins.map(p => p.init(serviceConfig)))
            return plugins
        })()
    ])
    console.log("plugins", toReturn[1])

    return {
        serviceConfig,
        service: toReturn[0],
        plugins: toReturn[1]
    }
}

const installPlugins = async (serviceConfig: ServiceConfig) => {
    const installingPlugins = serviceConfig.plugins.map(async (pluginConfig) => {
        if(pluginConfig.src_npm) {
            return await fetchPackageNpm(pluginConfig.src_npm)
        }
        else if (pluginConfig.src_http) {
            const installDir = await fetchPackageHttp(pluginConfig.name, pluginConfig.src_http)
            return (await installDepsAndReturnPackage(installDir)).pkg
        }
    })

    const toReturn = await Promise.all(installingPlugins);
    console.log("install plugins return", toReturn)
    return toReturn
}

const installDepsAndReturnPackage = async (dir: string) => {
    
    const result_npm = await execa("npm", ["install"], {
        localDir: dir,
        stdout: process.stdout,
        stderr: process.stderr
    });

    if(result_npm.exitCode !== 0){
        throw `npm install failed to install dependencies for ${dir}  ${result_npm}`;
    }

    
    const pkg = await import(dir);
    console.log("package", dir, pkg)
    return pkg
}

const fetchPackageGit = async (name: string, src_git: string): Promise<string> => {
    console.log("installing package from git", name, src_git)
    const packageDir = join(packagesDirPath, name);
    const options: SimpleGitOptions = {
        baseDir: packagesDirPath,
        binary: 'git',
        maxConcurrentProcesses: 6,
    };
    const git: SimpleGit = simpleGit(options);

    try {
        await git.clone(src_git, name)
        return packageDir
    }
    catch(e){
        console.error("failed to clone git repo and install dependencies", e)
    }
}

const fetchPackageHttp = async (name: string, src_http: string): Promise<string> => {
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
        unlink(downloadFileName) //this is a cleanup step and is not a dependency of any other process, therefore it is not necessary to wait for it to finish

        if(result_tar.exitCode !== 0){
            throw result_tar;
        }
        console.log("HTTP package installed", name, src_http)

        return packageDir
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

// export , t async (serviceName: string) => {
    
    
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