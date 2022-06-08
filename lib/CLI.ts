/// Native Modules
import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';

/// Node Imports
import { program } from 'commander';

/// TS-Bytenode Imports
const pkg = require('../package.json');
import { TSC, Bytecode } from '.';

/*****************
 *  CLI PROGRAM  *
 *****************/

// Base Properties.
program.name('tsb').version(`Version: ${pkg.version}`, '-v, --version', 'Output the package version.');

// Launcher.
program
    .command('run <filename>')
    .description('Launches a given bytenode file.')
    .action((fp: string) => {
        spawnSync(process.argv[0], ['-r', path.resolve(__dirname, 'wrapper.js'), fp], { stdio: 'inherit' });
    });

// Compiler.
program
    .description('Attempts compiling a given TS project to V8 bytecode.')
    .option('-c, --config <filename>', 'Specify a tsconfig.json file to compile from.', process.cwd())
    .action(({ config }: { config: string }) => {
        // coordinate the compilation as required
        const cache = TSC.project(config);

        // write every-file required from within the cache
        for (const [fp, buf] of cache) {
            fs.mkdirSync(path.dirname(fp), { recursive: true });
            fs.writeFileSync(fp + '.tsb', buf);
        }
    });

// convert the current arguments into suitable output
program.parse(process.argv);
