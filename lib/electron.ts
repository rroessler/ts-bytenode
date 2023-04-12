/// Node Modules
import fs from 'fs';
import path from 'path';
import assert from 'assert';
import cp from 'child_process';

/// TSB Modules
import * as TSC from './typescript';

/** Electron Compilation Functionality. */
export namespace Electron {
    //  PROPERTIES  //

    /** Fork options required for forking. */
    const m_options: cp.ForkOptions = {
        env: { ELECTRON_RUN_AS_NODE: '1', FORCE_COLOR: '1' },
        stdio: ['inherit', 'inherit', 'inherit', 'ipc'],
    };

    //  PUBLIC METHODS  //

    /**
     * Coordinates API compilation.
     * @param source                                    Source to compile.
     * @param options                                   Options to use.
     */
    export const compile = (source?: string | TSC.Program.IConfig, options: TSC.IOptions<string> = {}) => {
        // determine the electron path to be used for ts-bytenode
        const script = path.join(__dirname, 'bin', 'electron.js');

        // generate a sub-process to be used
        const child = cp.fork(runtime(), [script, JSON.stringify({ source, options })], {
            env: m_options.env,
            stdio: ['pipe', 'pipe', 'pipe', 'ipc'],
        });

        // prepare the output data object
        let data = Buffer.from([]);

        // handle incoming data with an adequate handler
        const transform = (entries: Array<[string, ArrayBufferLike]>) =>
            entries.map<[string, Buffer]>(([fp, d]) => [fp, Buffer.from(d)]);

        // and prepare the handler as necessary
        return new Promise<TSC.Cache>((resolve, reject) => {
            // wait for any incoming data
            child.stdout?.on('error', (err) => console.error(err));
            child.stdout?.on('data', (chunk) => (data = Buffer.concat([data, chunk])));
            child.stdout?.on('end', () => resolve(new Map(transform(JSON.parse(data.toString())))));

            // display an ongoing error instances
            child.stderr?.on('error', (err) => console.error(err));
            child.stderr?.on('data', (chunk) => console.error(chunk.toString()));

            // and handle exit requests
            child.on('exit', () => resolve(new Map()));
            child.on('error', (err) => reject(err));
        });
    };

    /**
     * Coordinates command-line forked compilation.
     * @param source                                    Source to compile.
     * @param args                                      Arguments to forward.
     */
    export const fork = (source?: string, ...args: string[]) => {
        // determine the base CLI path to be used for ts-bytenode
        const script = path.join(__dirname, 'bin', 'CLI.js');

        // generate a sub-process to be used
        const child = cp.fork(runtime(), [script, 'compile', source ?? ''].concat(args), m_options);

        // prepare the promise instance to be returned
        return new Promise<void>((resolve, reject) => {
            child.on('exit', () => resolve());
            child.on('error', (err) => reject(err));
        });
    };

    /** Gets the core Electron CLI path. */
    export const runtime = () => {
        // get the base source file
        const filePath = path.join(path.dirname(require.resolve('electron')), 'cli.js');

        // validate to ensure it exists
        assert(fs.existsSync(filePath), 'Electron.js is not installed');

        // and can return as normal
        return filePath;
    };
}
