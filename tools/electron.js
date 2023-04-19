/**************************************
 *  Test script for Electron options  *
 **************************************/

/// Node Modules
const path = require('path');

/// TSB Modules
const { TSB } = require('..');

//  PROPERTIES  //

const pipeline = path.join(__dirname, 'pipeline.js');
const tsconfig = path.join(__dirname, '..', 'example/tsconfig.json');

//  RUNNER  //

TSB.Electron.compileNativeFile({ filePath: __filename }).then(console.log);
TSB.Electron.compileProject(tsconfig).then(console.log);
