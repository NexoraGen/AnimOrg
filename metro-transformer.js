const expoBabelTransformer = require('expo/node_modules/@expo/metro-config/build/babel-transformer');

module.exports.transform = function (props) {
    let { src } = props;
    if (src && typeof src === 'string' && src.includes('import.meta')) {
        src = src.replace(/import\.meta\.env/g, '(process.env || { MODE: "development" })');
        src = src.replace(/import\.meta/g, '({ url: "", env: { MODE: "development" } })');
    }
    return expoBabelTransformer.transform({ ...props, src });
};
