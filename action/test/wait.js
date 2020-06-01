#! /usr/bin/env node

/* A script that runs indefinitely until killed by the user
 * used to create docker images that don't terminate, but
 * do nothing.
 */

setInterval(function(){}, 100000);