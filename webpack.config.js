
(function () {
    "use strict";
    const production = process.env.NODE_ENV !== 'development';
    const path = require('path');
    const webpack = require('webpack');

    module.exports = {
        mode: "development", // "production" | "development" | "none"
        entry: path.resolve(__dirname, "./src/picker.js"), // string | object | array 
        output: {
            path: path.resolve(__dirname, "dist"),
            filename: "./[name].bundle.js",
            publicPath: 'http://localhost:9000/'
        },
        module: {
            rules: [
                {
                    test: /\.vue$/,
                    use: [{
                        loader: "vue-loader"
                    }]
                },
                {
                    test: /\.(.?)css$/,
                    use: [{
                        loader: "style-loader"
                    }, {
                        loader: "css-loader"
                    }]
                },
                {
                    test: /\.scss$/,
                    use: [{
                        loader: 'sass-loader'
                    }]
                },
                {
                    test: /\.less$/,
                    use: [{
                        loader: 'less-loader'
                    }]
                }
            ]
        },
        resolve: {
            modules: [
                "node_modules" ,
            ],
            alias: {
                'vue': 'vue/dist/vue.common.js',
                "app": 'node_modules'
            },
        },
        devServer: {
            overlay: true, // immediate feedback on compiler errors -- will show an overlay on the browser
            compress: true,
            hot: true,
            port: 9000,
            headers: {
                "Access-Control-Allow-Credentials": "true",
                "Access-Control-Allow-Headers": "Content-Type, Authorization, x-id, Content-Length, X-Requested-With",
                "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS"
            }
        }
    };
}());