/// Node Modules
import fs from 'fs';

/// TSB Modules
import { TSB } from '..';

//  PROPERTIES  //

// attempt parsing the incoming arguments
const script: TSB.Electron.Script = JSON.parse(process.argv.at(-1) as string);

//  RUNNER  //

// get the scripts base contents to compile
const code = 'buffer' in script ? script.buffer.toString() : fs.readFileSync(script.filePath, 'utf-8');

// and finally attempt constructing the compiled project
const bytecode = new TSB.Bytecode(code, {}, true);

// and write back the outgoing compiled value
process.stdout.write(bytecode.buffer);
