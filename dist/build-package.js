var exec = require('child_process').exec;
function puts(error, stdout, stderr) { console.log(stdout) }

var os = require('os');
//control OS
//then run command depengin on the OS

if (os.type() === 'Linux') 
   exec("dist/package.sh", puts); 
else if (os.type() === 'Darwin') 
   exec("dist/package.sh", puts); 
else if (os.type() === 'Windows_NT') 
   exec("powershell dist/package.sh", puts);
else
   throw new Error("Unsupported OS found: " + os.type());