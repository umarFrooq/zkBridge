const Service = require('node-windows').Service;
const path = require('path');
const fs = require('fs');

// Load config to get the service name and description
const configPath = path.join(__dirname, 'config.json');
let config = {};
try {
    if (fs.existsSync(configPath)) {
        config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    }
} catch (e) {
    console.error("Could not load or parse config.json. Using default service name.");
}

// Create a new service object
const svc = new Service({
    name: config.serviceName || 'ZKTeco-HRM-Service',
    description: config.serviceDescription || 'ZKTeco to HRM Integration Service.',
 script: path.join(__dirname, 'main.js'),
 nodeOptions: [
  '--harmony',
  '--max_old_space_size=4096'
 ]
});

// Listen for the "install" event, which indicates the process is available as a service.
svc.on('install', function(){
 console.log('Service installed successfully!');
 console.log('The service exists: ', svc.exists);
 svc.start();
});

// Listen for the "start" event and let us know when the process has actually started working.
svc.on('start', function(){
 console.log(svc.name + ' started! Service is now running.');
});

// Listen for the "stop" event and let us know when the process has actually stopped working.
svc.on('stop', function(){
 console.log(svc.name + ' stopped.');
});

// Listen for the "uninstall" event so we know when it's done.
svc.on('uninstall', function(){
 console.log('Uninstall complete.');
 console.log('The service exists: ', svc.exists);
});

// Get command line arguments
const args = process.argv.slice(2);
const command = args[0];

switch(command) {
 case 'install':
  console.log('Installing service...');
  svc.install();
  break;
 case 'uninstall':
  console.log('Uninstalling service...');
  svc.uninstall();
  break;
 case 'start':
  console.log('Starting service...');
  svc.start();
  break;
 case 'stop':
  console.log('Stopping service...');
  svc.stop();
  break;
 default:
  console.log('Usage: node install-service.js [install|uninstall|start|stop]');
}

module.exports = svc;
