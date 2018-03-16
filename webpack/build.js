var path = require('path');

var webConfig = {
    devtool: '#source_map',
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
            test: /\.jsx?$/,
            use: [
                { loader: 'babel-loader'}
            ]
        }]
    },
    node: {
        fs: "empty"
    }
}

var nodeConfig = {
    target: "node",
    entry: './src/index.js',
    output: {
        path: path.resolve(__dirname, 'lib'),
        filename: 'weave.node.js',
        library: 'weave',
        libraryTarget: 'umd'
    },
    module: {
        rules: [{
            exclude: /nacl_factory.js$/,
            test: /\.jsx?$/,
            use: [
                { loader: 'babel-loader'}
            ]
        }]
    },
}

module.exports = [webConfig, nodeConfig]
