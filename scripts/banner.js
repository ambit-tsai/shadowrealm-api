const pkg = require('../package.json');

module.exports = `
/**
 * ${pkg.name}@${pkg.version}
 * ${pkg.description}
 * @author ${pkg.author}
 * @license ${pkg.license}
 * @see {@link ${pkg.homepage}}
 */`
