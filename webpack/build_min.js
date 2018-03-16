var path = require('path');

module.exports = {
    entry: './src/index.js',
    output: {
        path: path.resolve(__dirname, 'lib'),
        filename: 'weave.js',
        library: 'weave',
        libraryTarget: 'umd'
    },
    module: {
        rules: [{
            exclude: /nacl_factory.js$/,
            test: /\.(js|jsx)$/,
            use: [{
                loader: 'babel-loader',
                query: {
                    presets: ['babili']
                }
            }]
        }]
    },
    node: {
        fs: "empty"
    }
}
