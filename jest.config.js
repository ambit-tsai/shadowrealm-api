/*
 * For a detailed explanation regarding each configuration property, visit:
 * https://jestjs.io/docs/configuration
 */

module.exports = {
    projects: [
        {
            displayName: 'browser',
            preset: 'jest-puppeteer',
            setupFilesAfterEnv: [
                './test/setup-browser.js',
            ],
            testMatch: [
                '**/test/browser/**/*.js',
                '**/test/common/**/*.js',
            ],
        },
        // {
        //     displayName: 'node',
        //     setupFilesAfterEnv: [
        //         './test/setup-node.js',
        //     ],
        //     testMatch: [
        //         '**/test/node/**/*.js',
        //         '**/test/common/**/*.js',
        //     ],
        //     testPathIgnorePatterns: [
        //         '/node_modules/',
        //         '/dist/',
        //     ],
        // },
    ],
    testPathIgnorePatterns: [
        '/node_modules/',
        '/dist/',
    ],
};
