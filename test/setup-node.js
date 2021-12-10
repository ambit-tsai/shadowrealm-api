require('../dist/node/polyfill');
const { mkdtemp, writeFile } = require('fs/promises');
const path = require('path');
const os = require('os');


global.sr = new ShadowRealm();


/**
 * 
 * @param {string} name 
 * @param {() => boolean} fn pass when return true
 * @param {number} timeout 
 */
global.diyTest = function (name, fn, timeout = 1000) {
    test(name, async () => {
        let result;
        try {
            result = await fn();
        } catch (error) {
            console.log(error);
        }
        expect(result).toBe(true);
    }, timeout);
};


global.createSpecifier = async function (code) {
    if (!global._tempPath) {
        global._tempPath = await mkdtemp(path.resolve(os.tmpdir(), 'ShadowRealm-'));
        global._counter = 0;
    }
    const file = `${global._tempPath}/${global._counter++}.mjs`;
    await writeFile(file, code);
    return file;
};
