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
    compileForBrowser();
    compileForNode();
    copyFile('package.json');
    copyFile('README.md');
    copyFile('LICENSE');
})();


async function compileForBrowser() {
    const bundle = await rollup.rollup({
        input: [
            'src/browser/index.ts',
            'src/browser/polyfill.ts',
        ],
        plugins: [
            typescript(),
            terser(),
        ],
    });
    await bundle.write({
        dir: 'dist',
        banner,
        format: 'esm',
        entryFileNames: 'browser/[name].js',
        sourcemap: true,
    });
}


async function compileForNode() {
    const bundle = await rollup.rollup({
        input: [
            'src/node/index.ts',
            'src/node/polyfill.ts',
        ],
        external: ['vm', '.'],
        plugins: [typescript()],
    });
    await bundle.write({
        dir: 'dist',
        banner,
        format: 'cjs',
        exports: 'auto',
        entryFileNames: 'node/[name].js',
    });
    await bundle.write({
        dir: 'dist',
        banner,
        format: 'esm',
        entryFileNames: 'node/[name].mjs',
    });
}


function copyFile(file) {
    fs.copyFile(file, `dist/${file}`, err => {
        if (err) console.log(err);
    });
}