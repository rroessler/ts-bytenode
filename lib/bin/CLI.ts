/// Native Modules
import fs from 'fs';
import os from 'os';
import path from 'path';
import cp from 'child_process';

/// Library Modules
import { program } from 'commander';

/// TSB Modules
import { TSB, TSC } from '..';
const pkg = require('../../package.json');

/** CLI Functionality. */
export namespace CLI {
    //  TYPEDEFS  //

    /** Compilation Command Options. */
    export interface IOptions {
        mode: TSB.Mode;
        config: string;
        outDir: string;
        ignore: string[];
        electron: boolean;
        extension: `.${string}`;
    }

    //  RUNNER  //

    // base properties
    program.allowExcessArguments(false);
    program.addHelpCommand('help [command]', 'Display help for an optional command.');
    program.name('tsb').version(`Version: ${pkg.version}${os.EOL}`, '-v, --version', 'Output the package version');

    // primary launcher
    program
        .command('run <filename>')
        .addHelpText('after', ' ')
        .description('Launches a given bytecode file.')
        .action((fp: string) => {
            cp.spawnSync(process.argv[0], ['-r', path.resolve(__dirname, 'wrapper.js'), fp], { stdio: 'inherit' });
        });

    // compilation handlers
    program
        .command('compile')
        .addHelpText('after', ' ')
        .description('Attempts compiling a given TS project to V8 bytecode.')
        .option('-c, --config <fileName>', 'Specify a tsconfig.json file to compile from.', process.cwd())
        .option('-m, --mode <"prod"|"dev">', 'The output build type.', 'prod')
        .option('-d, --outDir <path>', 'Optional directory to append to the current "tsconfig.json" outDir.', '')
        .option('-e, --electron', 'Compile against an Electron process.', false)
        .option('-i, --ignore <patterns...>', 'Ignore generating bytecode for files by given glob patterns.', [])
        .option('-x, --ext <extension>', 'The file-extension to use for bytecode outputs.', '.tsb')
        .action(async ({ config, electron, mode, outDir, ignore, extension }: IOptions) => {
            // ensure the given mode is correct
            if (!['prod', 'dev'].includes(mode))
                return program.error(`error: option '-m, --mode <"prod"|"dev">' received invalid value '${mode}'`);

            // coordinate the compilation as required with a valid `tsconfig.json` file
            const confPath = fs.statSync(config).isDirectory() ? path.join(config, 'tsconfig.json') : config;

            // if we have an electron instance
            if (electron && mode === 'prod') {
                const args = ['-m', mode ?? 'prod'];
                if (outDir) args.push('-d', outDir);
                if (ignore.length) args.push('-i', ...ignore);
                return TSB.Electron.fork(confPath, ...args);
            }

            // prepare the cache as currently necessary
            const cache = TSC.project(confPath, { codegen: mode === 'prod', outDir, ignore, extension });

            // write every-file required from within the cache
            cache.forEach((buffer, filePath) => {
                fs.mkdirSync(path.dirname(filePath), { recursive: true });
                fs.writeFileSync(filePath, buffer);
            });
        });

    // help modification
    program.addHelpText('after', ' ').helpOption('-h, --help', 'Display help information.');

    // convert the current arguments into suitable output
    program.parse(process.argv);
}
