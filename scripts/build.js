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
    // compileForNode();
    copyFile('index.d.ts');
    copyFile('package.json');
    copyFile('README.md');
    copyFile('LICENSE');
})();


const terserPlugin = terser({
    keep_fnames: /^ShadowRealm|evaluate|importValue|eval|Function$/,
});


async function compileForBrowser() {
    const bundle = await rollup.rollup({
        input: [
            'src/browser/index.ts',
            'src/browser/polyfill.ts',
        ],
        plugins: [
            typescript(),
            terserPlugin,
        ],
    });
    await bundle.write({
        dir: 'dist/browser',
        banner,
        format: 'esm',
        entryFileNames: '[name].mjs',
        sourcemap: true,
    });

    const polyfillBundle = await rollup.rollup({
        input: 'src/browser/polyfill.ts',
        plugins: [
            typescript(),
            terserPlugin,
        ],
    });
    await polyfillBundle.write({
        dir: 'dist/browser',
        banner,
        format: 'umd',
        entryFileNames: '[name].umd.js',
        sourcemap: true,
    });

    const indexBundle = await rollup.rollup({
        input: 'src/browser/index.ts',
        plugins: [
            typescript(),
            terserPlugin,
        ],
    });
    await indexBundle.write({
        dir: 'dist/browser',
        banner,
        format: 'umd',
        entryFileNames: '[name].umd.js',
        name: 'ShadowRealm',
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