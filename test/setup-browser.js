const path = require('path');
const fs = require('fs');


const polyfillPath = path.resolve(__dirname, '../dist/browser/polyfill.umd.js');
const codeOfShadowRealm = fs.readFileSync(polyfillPath, 'utf8');


page.evaluate(codeOfShadowRealm + `;
    window.sr = new ShadowRealm();

    /**
     * Create data uri by code
     * @param {string} code 
     * @returns {string}
     */
    window.createSpecifier = function (code) {
        return 'data:text/javascript;base64,' + btoa(code);
    };
`);


/**
 * 
 * @param {string} name 
 * @param {() => boolean} fn pass when return true
 * @param {number} timeout 
 */
global.diyTest = function (name, fn, timeout) {
    test(name, async () => {
        let result;
        try {
            result = await page.evaluate(fn);
        } catch (error) {
            console.log(error);
        }
        expect(result).toBe(true);
    }, timeout);
};
