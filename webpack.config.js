
(function () {
    "use strict";
    const production = process.env.NODE_ENV !== 'development';
    const path = require('path');
    const webpack = require('webpack');

    module.exports = {
        mode: "development", // "production" | "development" | "none" 
        entry: "./src/main.js", // string | object | array 
        output: {
            // options related to how webpack emits results
            path: path.resolve(__dirname, "dist"), // string
            // the target directory for all output files
            // must be an absolute path (use the Node.js path module)
            filename: "./picker.js", // string    // the filename template for entry chunks
            publicPath: "/assets", // string    // the url to the output directory resolved relative to the HTML page
            library: "MyLibrary", // string,
            // the name of the exported library
            libraryTarget: "umd", // universal module definition    // the type of the exported library
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
                    test: /\.(s*)css$/,
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
            ]
        },
        resolve: {
            // options for resolving module requests
            // (does not apply to resolving to loaders)
            modules: [
                "node_modules",
                path.resolve(__dirname, "app")
            ],
            alias: {
                'vue': 'vue/dist/vue.common.js'
            }
        },
        // configuration for hot reloading
        devServer: {
            overlay: true, // immediate feedback on compiler errors -- will show an overlay on the browser
            compress: true,
            port: 9000,
            publicPath: "http://localhost:9000", // This must match the DEV_SERVER_PATH path in WebpackBundleRenderer.cs.
            headers: { // CORS stuff necessary to allow main application to request files from webpack-dev-server
                "Access-Control-Allow-Origin": "http://localhost:25016",
                "Access-Control-Allow-Credentials": "true",
                "Access-Control-Allow-Headers": "Content-Type, Authorization, x-id, Content-Length, X-Requested-With",
                "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS"
            }
        },
        plugins: [
            new webpack.DefinePlugin({
                'process.env': {
                    NODE_ENV: '"development"'
                }
            })
        ],
    };
}());