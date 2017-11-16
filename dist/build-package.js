var spawn = require('child_process').spawn;
var os = require('os');

if (os.type() === 'Linux') {
   spawn('bash', ['dist/package.sh'], {stdio: 'inherit'});
} else if (os.type() === 'Darwin') {
   spawn('bash', ['dist/package.sh'], {stdio: 'inherit'});
} else if (os.type() === 'Windows_NT') {
   spawn('powershell', ['dist/package.sh'], {stdio: 'inherit'});
} else {
   throw new Error("Unsupported OS found: " + os.type());
}
