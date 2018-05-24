/* eslint-disable max-len */
/**
 * Build config for development process that uses Hot-Module-Replacement
 * https://webpack.github.io/docs/hot-module-replacement-with-webpack.html
 */

import webpack from 'webpack';
import validate from 'webpack-validator';
import merge from 'webpack-merge';
import baseConfig from './webpack.config.base';

const port = process.env.PORT || 3000;

export default validate(merge(baseConfig, {
    debug: true,

    devtool: 'inline-source-map',

    entry: {
        bundle: [
            `webpack-hot-middleware/client?path=http://localhost:${port}/__webpack_hmr`,
            'babel-polyfill',
            './app/index'
        ],
    },

    output: {
        publicPath: `http://localhost:${port}/dist/`,
        filename: '[name].js',
    },

    module: {
        loaders: [

            // Fonts
            {test: /\.woff(\?v=\d+\.\d+\.\d+)?$/, loader: 'url?limit=10000&mimetype=application/font-woff'},
            {test: /\.woff2(\?v=\d+\.\d+\.\d+)?$/, loader: 'url?limit=10000&mimetype=application/font-woff'},
            {test: /\.ttf(\?v=\d+\.\d+\.\d+)?$/, loader: 'url?limit=10000&mimetype=application/octet-stream'},
            {test: /\.eot(\?v=\d+\.\d+\.\d+)?$/, loader: 'file'},
            {test: /\.svg(\?v=\d+\.\d+\.\d+)?$/, loader: 'url?limit=10000&mimetype=image/svg+xml'},

            {
                test: /\.less$/,
                loaders: [
                    'style-loader',
                    'css-loader?importLoaders=1&sourceMap',
                    'less-loader?strictMath&noIeCompat&sourceMap'
                ]
            }
        ]
    },

    plugins: [
        // for bindings package, see https://github.com/rwaldron/johnny-five/issues/1101#issuecomment-213581938
        new webpack.ContextReplacementPlugin(/bindings$/, /^$/),

        // https://webpack.github.io/docs/hot-module-replacement-with-webpack.html
        new webpack.HotModuleReplacementPlugin(),

        // “If you are using the CLI, the webpack process will not exit with an error code by enabling this plugin.”
        // https://github.com/webpack/docs/wiki/list-of-plugins#noerrorsplugin
        new webpack.NoErrorsPlugin(),

        // NODE_ENV should be production so that modules do not perform certain development checks
        new webpack.DefinePlugin({
            DEBUG: true,
            'process.env.NODE_ENV': JSON.stringify('development')
        })
    ],

    externals: ['bindings'],

    // https://github.com/chentsulin/webpack-target-electron-renderer#how-this-module-works
    target: 'electron-renderer'
}));
