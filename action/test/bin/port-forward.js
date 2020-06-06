#! /usr/bin/env node

/*
 * A script that forwards port 2930 to 2992 to allow for attaching a debugger
 * from outside of the docker image.
 */

const net = require('net');

net.createServer(from => {
  console.log('New Connection');
  try {
    const to = net.createConnection({
      host: 'localhost',
      port: 9229
    });
    const close = () => {
      to.destroy();
      from.destroy();
    }
    from.pipe(to);
    to.pipe(from);
    to.on('close', close);
    to.on('error', close);
    to.on('end', close);
    from.on('close', close);
    from.on('error', close);
    from.on('end', close);
  } catch {
    console.log('Unable to connect');
    from.destroy();
  }
}).listen(9230);