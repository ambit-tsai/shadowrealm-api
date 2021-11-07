const fs = require('fs');
const rollup = require('rollup');
const typescript = require('@rollup/plugin-typescript');
const { terser } = require('rollup-plugin-terser');
const banner = require('./banner');


(async () => {
    await fs.promises.rm('dist', {
        force: true,
        recursive: true,
    });
    await fs.promises.mkdir('dist');
    compile('src/browser/index.ts', 'dist/browser');
    compile('src/browser/polyfill.ts', 'dist/browser');
    copyFile('package.json');
    copyFile('README.md');
    copyFile('LICENSE');
})();


async function compile(file, outDir) {
    const bundle = await rollup.rollup({
        input: file,
        plugins: [
            typescript(),
            terser(),
        ],
    });
    await bundle.write({
        dir: outDir,
        banner,
        format: 'esm',
        sourcemap: true,
    });
}


function copyFile(file) {
    fs.copyFile(file, `dist/${file}`, err => {
        if (err) console.log(err);
    });
}