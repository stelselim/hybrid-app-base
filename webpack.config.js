const path = require("path");

let {merge: webpack_merge} = require('webpack-merge');

const CopyWebpackPlugin = require("copy-webpack-plugin");
const ZipPlugin = require("zip-webpack-plugin");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const HtmlWebpackTagsPlugin = require('html-webpack-tags-plugin');
const TerserPlugin = require('terser-webpack-plugin');

const Mustache = require("mustache");

const base_config = require("./webpack.config.base");

const utils = require("./utils");

module.exports = function (env) {
    const settings = require("./settings")(env);

    const config_template_path = utils.getBaseOrCustomPath("src/config.xml.mustache");
    const settings_template_path = utils.getBaseOrCustomPath("src/www/settings.json.mustache");
    const index_template_path = utils.getBaseOrCustomPath("src/www/index.html.mustache");
    const styling_path = utils.getBaseOrCustomPath("src/www/styles/");
    const google_services_json_path = utils.getBaseOrCustomPath("config/google-services.json");
    const google_service_plist_path = utils.getBaseOrCustomPath("config/GoogleService-Info.plist");
    const build_extras_gradle_path = utils.getBaseOrCustomPath("config/build-extras.gradle");
    const before_build_script_path = utils.getBaseOrCustomPath("scripts/before_build.js");


    let config = webpack_merge(base_config(env), {
        plugins: [
            new CopyWebpackPlugin({
                patterns: [ // Process and copy the config.xml file
                    {
                        context: path.dirname(config_template_path),
                        from: path.basename(config_template_path),
                        to: "config.xml",
                        transform: function (content) {
                            return Mustache.render(content.toString(), settings);
                        }
                    },
                    {
                        context: path.dirname(settings_template_path),
                        from: path.basename(settings_template_path),
                        to: path.normalize("www/settings.json"),
                        transform: function (content) {
                            return Mustache.render(content.toString(), settings);
                        }
                    }
                ]
            }),
            new CopyWebpackPlugin({ // Resource files
                patterns: [
                    ...utils.getBaseAndCustomPaths("src/resources").map(function (dir) {
                        return {
                            context: dir,
                            from: "**/*",
                            to: "res",
                            noErrorOnMissing: true
                        }
                    })
                ]
            }),
            new CopyWebpackPlugin({
                patterns: [
                    {
                        context: path.dirname(styling_path),
                        from: '**/*.css.mustache',
                        to: path.normalize("www/css/[name]"),
                        transform: function (content) {
                            return Mustache.render(content.toString(), settings);
                        }
                    }
                ]
            }),
            new CopyWebpackPlugin({
                patterns: [
                    {
                        context: path.dirname(styling_path),
                        from: '**/*.css',
                        to: path.normalize("www/css/[name].css")
                    },
                ]
            }),
            new HtmlWebpackPlugin(Object.assign({ // Generate the index.html
                filename: "www/index.html",
                inject: "body",
                template: index_template_path
            }, settings)),
            new HtmlWebpackTagsPlugin({ // Copy styling files
                assets: [
                    "www/css/index.css",
                    {path: 'www/css', glob: '**/*.css', globPath: path.normalize('src/www/styles/')}
                ],
                append: false
            })
        ]
    });

    if (settings.permissions.push) {
        config = webpack_merge(config, {
            plugins: [
                new CopyWebpackPlugin({
                    patterns: [
                        {
                            context: path.dirname(build_extras_gradle_path),
                            from: path.basename(build_extras_gradle_path),
                            to: path.join("config", path.basename(build_extras_gradle_path))
                        },
                        {
                            context: path.dirname(before_build_script_path),
                            from: path.basename(before_build_script_path),
                            to: path.join("scripts", path.basename(before_build_script_path))
                        },
                        {
                            context: path.dirname(google_services_json_path),
                            from: path.basename(google_services_json_path),
                            to: path.join("config", path.basename(google_services_json_path)),
                            noErrorOnMissing: true
                        },
                        {
                            context: path.dirname(google_service_plist_path),
                            from: path.basename(google_service_plist_path),
                            to: path.join("config", path.basename(google_service_plist_path)),
                            noErrorOnMissing: true
                        }
                    ]
                })
            ]
        });
    }

    config = webpack_merge(config, {
        plugins: [
            new ZipPlugin({
                path: "../dist",
                filename: utils.constructArchiveName(settings)
            })
        ]
    });

    if (!settings.options.debug) {
        config = webpack_merge(config, {
            devtool: "source-map",
            optimization: {
                minimize: true,
                minimizer: [
                    new TerserPlugin({
                        parallel: 2,
                        terserOptions: {
                            ecma: 5,
                            toplevel: true
                        }
                    })
                ]
            }
        });
    }

    return config;
};
