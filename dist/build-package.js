var spawn = require('child_process').spawn;
var os = require('os');
var process = require('process');

var args = process.argv.slice(2);

function abortOnError(code) {
    if (code !== 0) {
        process.exit(code);
    }
}

if (os.type() === 'Linux') {
   spawn('bash', ['dist/package.sh'].concat(args), {stdio: 'inherit'}).on('exit', abortOnError);
} else if (os.type() === 'Darwin') {
   spawn('bash', ['dist/package.sh'].concat(args), {stdio: 'inherit'}).on('exit', abortOnError);
} else if (os.type() === 'Windows_NT') {
   spawn('powershell', ['dist/package.sh'].concat(args), {stdio: 'inherit'}).on('exit', abortOnError);
} else {
   throw new Error("Unsupported OS found: " + os.type());
}
