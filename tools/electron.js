/**************************************
 *  Test script for Electron options  *
 **************************************/

/// Node Modules
const path = require('path');

/// TSB Modules
const { TSB } = require('..');

//  PROPERTIES  //

const rootDir = path.join(__dirname, '..', 'example/tsconfig.json');
const pipeline = path.join(__dirname, 'pipeline.js');

//  RUNNER  //

TSB.Electron.compileProject(rootDir, { pipeline, codegen: false }).then((cache) =>
    cache.forEach((buffer) => console.log(buffer.toString()))
);
