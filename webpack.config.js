const path = require("path");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const UglifyJsPlugin = require('uglifyjs-webpack-plugin')


module.exports = (_env, argv) => {
    const isProd = argv.mode === "production";
    if(isProd) {
        console.log("Building for prod");
    }

    const cfg = {
        mode: isProd ? "production" : "development",
        entry: "./src/index.tsx",
        target: "web",

        output: {
            path: path.resolve(__dirname, "dist"),
            filename: "index.[hash].js",
        },

        module: {
            rules: [
                {
                    test: /.tsx?$/,
                    use: [

                        {
                            loader: "ts-loader",
                            options: {
                                onlyCompileBundledFiles: true
                            }
                        }
                    ],
                },
                {
                    test: /.scss$/,
                    use: [
                        "style-loader",
                        "css-loader",
                        "sass-loader"
                    ]
                },
            ]
        },

        // https://github.com/webpack/webpack-dev-server/tree/master/examples/cli/history-api-fallback
        devServer: {
            historyApiFallback: true,
        },


        resolve: {
            extensions: [".tsx", ".ts", ".js"],
            modules: [
                "node_modules",
                path.resolve(__dirname, "src/"),
                path.resolve(__dirname, "static/")
            ],
        },


        plugins: [
            new HtmlWebpackPlugin({
                template: "./static/index.html",
                hash: true,
            }),
        ]
    };

    if(!isProd) {
        cfg.devtool = "source-map"
    }

    if(isProd) {
        cfg.optimization = { minimizer: [new UglifyJsPlugin({ test: /\.js$|\.jsx$|\.ts$|\.tsx$/i, parallel: true })] };
    }

    return cfg;
}

