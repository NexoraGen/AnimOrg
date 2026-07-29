import { createRequire } from 'module';
const require = createRequire(import.meta.url);

try {
    require('react-native-youtube-iframe');
    console.log("react-native-youtube-iframe imports successfully.");
} catch (e) {
    console.error("Crash on importing react-native-youtube-iframe:");
    console.error(e);
}
