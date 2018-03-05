import fs from "fs";
import path from "path";

//------------- load fixtures ------------

let fixDir = path.resolve(__dirname, "..", "fixtures");


export async function loadFixtures(filename) {
    let json = await loadJSON(filename);
    let pbHex = await loadPB(filename);
    return {json, pbHex, pbBuffer: () => new Buffer(pbHex, 'hex')};
}

async function loadJSON(filename) {
    let filepath = path.resolve(fixDir, filename) + ".json";
    let data = await readFile(filepath);
    // TODO: all _ in keys to camel case
    return data.replace(/currency_code/g, "currencyCode");
}

async function loadPB(filename) {
    let filepath = path.resolve(fixDir, filename) + ".bin";
    let data = await readFile(filepath, 'hex');
    return data;
}

// readFile transforms callback into promise to async-ify it
// https://stackoverflow.com/questions/40593875/using-filesystem-in-node-js-with-async-await
const readFile = (path, opts = 'utf8') =>
    new Promise((res, rej) => {
        fs.readFile(path, opts, (err, data) => {
            if (err) rej(err)
            else res(data)
        })
    })