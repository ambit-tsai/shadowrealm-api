import { rm, mkdir } from 'fs/promises';
import { rollup } from 'rollup';
import typescript from '@rollup/plugin-typescript';
import { terser } from 'rollup-plugin-terser';
import pkg from '../package.json';

const banner = `
/**
 * ${pkg.name}@${pkg.version}
 * ${pkg.description}
 * @author ${pkg.author.name} <${pkg.author.email}>
 * @license ${pkg.license}
 * @see {@link ${pkg.homepage}}
 */`;

await rm('dist', {
    force: true,
    recursive: true,
});
await mkdir('dist');

const terserPlugin = terser({
    keep_fnames: /^ShadowRealm|evaluate|importValue|eval|Function$/,
});

const bundle = await rollup({
    input: ['src/index.ts', 'src/polyfill.ts'],
    plugins: [typescript(), terserPlugin],
});
await bundle.write({
    dir: 'dist',
    banner,
    format: 'esm',
    sourcemap: true,
});

const polyfillBundle = await rollup({
    input: 'src/polyfill.ts',
    plugins: [typescript(), terserPlugin],
});
await polyfillBundle.write({
    dir: 'dist',
    banner,
    format: 'umd',
    entryFileNames: '[name].umd.js',
    sourcemap: true,
});
