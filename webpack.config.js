const path = require("path");
const HtmlWebpackPlugin = require("html-webpack-plugin");

module.exports = {
    mode: "development",
    entry: "./src/index.tsx",
    devtool: "source-map",
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
