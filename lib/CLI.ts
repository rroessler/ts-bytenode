/// Native Modules
import fs from 'fs';
import os from 'os';
import path from 'path';
import { spawnSync } from 'child_process';

/// Node Imports
import { program } from 'commander';

/// TS-Bytenode Imports
const pkg = require('../package.json');
import { TSC } from '.';

/**************
 *  TYPEDEFS  *
 **************/

/// Compilation Command Options.
interface IOptions {
    config: string;
    electron: boolean;
    mode: 'prod' | 'dev';
    outDir: string;
    ignore: string[];
}

/*****************
 *  CLI PROGRAM  *
 *****************/

// Base Properties.
program.name('tsb').version(`Version: ${pkg.version}${os.EOL}`, '-v, --version', 'Output the package version.');
program.addHelpCommand('help [command]', 'Display help for an optional command.');

// Launcher.
program
    .command('run <filename>')
    .addHelpText('after', ' ')
    .description('Launches a given bytecode file.')
    .action((fp: string) => {
        spawnSync(process.argv[0], ['-r', path.resolve(__dirname, 'wrapper.js'), fp], { stdio: 'inherit' });
    });

// Compiler.
program
    .command('compile')
    .addHelpText('after', ' ')
    .description('Attempts compiling a given TS project to V8 bytecode.')
    .arguments('[fileName]')
    .option('-c, --config <fileName>', 'Specify a tsconfig.json file to compile from.', process.cwd())
    .option('-m, --mode <"prod"|"dev">', 'The output build type.', 'prod')
    .option('-d, --outDir <path>', 'Optional directory to append to the current "tsconfig.json" outDir.', '')
    .option('-e, --electron', 'Compile against an Electron process.', false)
    .option('-i, --ignore <patterns...>', 'Ignore files by given glob patterns.', [])
    .action(async (fileName: string, { config, electron, mode, outDir, ignore }: IOptions) => {
        // ensure the given mode is correct
        if (!['prod', 'dev'].includes(mode))
            return program.error(`error: option '-m, --mode <"prod"|"dev">' received invalid value '${mode}'`);

        // need to resolve a valid file-path to use
        const filePath = fileName ?? config;

        // coordinate the compilation as required with a valid `tsconfig.json` file
        const confPath = fs.statSync(filePath).isDirectory() ? path.join(filePath, 'tsconfig.json') : filePath;
        const options = { codegen: mode === 'prod', outDir, noCompile: ignore };

        // if we have an electron instance
        if (electron && mode === 'prod') return TSC.electronify(confPath);

        // prepare the cache as currently necessary
        const cache = TSC.project(confPath, options);
        const ext = mode === 'prod' ? '.tsb' : '.js';

        // write every-file required from within the cache
        for (const [fp, buf] of cache) {
            fs.mkdirSync(path.dirname(fp), { recursive: true });
            fs.writeFileSync(fp + ext, buf);
        }
    });

// Help Modification.
program.addHelpText('after', ' ').helpOption('-h, --help', 'Display help information.');

// convert the current arguments into suitable output
program.parse(process.argv);
