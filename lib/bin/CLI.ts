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
    }

    //  PUBLIC METHODS  //

    /** CLI Launcher. */
    export const launch = () => {
        // base properties
        program.name('tsb').version(`Version: ${pkg.version}${os.EOL}`, '-v, --version', 'Output the package version');
        program.addHelpCommand('help [command]', 'Display help for an optional command.');

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

                // if we have an electron instance
                if (electron && mode === 'prod') {
                    const args = ['-m', mode ?? 'prod'];
                    if (outDir) args.push('-d', outDir);
                    if (ignore.length) args.push('-i', ...ignore);
                    return TSB.Electron.fork(confPath, ...args);
                }

                // prepare the cache as currently necessary
                const cache = TSC.project(confPath, { codegen: mode === 'prod', outDir, ignore });
                const extension = mode === 'prod' ? '.tsb' : '.js';

                // write every-file required from within the cache
                cache.forEach((buf, fp) => {
                    fs.mkdirSync(path.dirname(fp), { recursive: true });
                    fs.writeFileSync(fp + extension, buf);
                });
            });

        // help modification
        program.addHelpText('after', ' ').helpOption('-h, --help', 'Display help information.');

        // convert the current arguments into suitable output
        program.parse(process.argv);
    };
}

/// Run the launcher!
CLI.launch();
