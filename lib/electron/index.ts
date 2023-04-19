/// Node Modules
import fs from 'fs';
import path from 'path';
import cp from 'child_process';

/// TSB Modules
import { Assert } from '../assert';
import * as TSC from '../typescript';

/** Electron Compilation Functionality. */
export namespace Electron {
    //  TYPEDEFS  //

    /** File-Path Interface. */
    export interface IFilePath {
        filePath: string;
    }

    /** Buffer Interface. */
    export interface IBuffer {
        buffer: string | Buffer;
    }

    /** Script Typing Instance. */
    export type Script = IFilePath | IBuffer;

    //  PROPERTIES  //

    /** Fork options required for forking. */
    const m_options: cp.ForkOptions = {
        env: { ELECTRON_RUN_AS_NODE: '1', FORCE_COLOR: '1' },
        stdio: ['inherit', 'inherit', 'inherit', 'ipc'],
    };

    //  PUBLIC METHODS  //

    /**
     * Compiles a native JavaScript file for Electron.
     * @param script                            File to compile.
     */
    export const compileNativeFile = (script: Script) => {
        // determine the native-electron wrapper to use
        const runner = path.join(__dirname, 'native.js');
        const fopts: cp.ForkOptions = { ...m_options, stdio: 'pipe' };

        // generate a sub-process to be used
        const child = cp.fork(runtime(), [runner, JSON.stringify(script)], fopts);

        // prepare the completion handlers
        const end = (data: Buffer) => data;
        const exit = () => Buffer.alloc(0);

        // and prepare the handler as necessary
        return m_promisify(child, end, exit);
    };

    /**
     * Coordinates API compilation.
     * @param source                                    Source to compile.
     * @param options                                   Options to use.
     */
    export const compileProject = (source?: string | TSC.Program.IConfig, options: TSC.IOptions<string> = {}) => {
        // determine the electron path to be used for ts-bytenode
        const runner = path.join(__dirname, 'project.js');
        const fopts: cp.ForkOptions = { ...m_options, stdio: 'pipe' };

        // generate a sub-process to be used
        const child = cp.fork(runtime(), [runner, JSON.stringify({ source, options })], fopts);

        // handle incoming data with an adequate handler
        const transform = (entries: Array<[string, ArrayBufferLike]>) =>
            entries.map<[string, Buffer]>(([fp, d]) => [fp, Buffer.from(d)]);

        // prepare the completion handlers
        const exit = () => new Map();
        const end = (data: Buffer) => new Map(transform(JSON.parse(data.toString())));

        // and prepare the handler as necessary
        return m_promisify(child, end, exit);
    };

    /**
     * Coordinates command-line forked compilation.
     * @param source                                    Source to compile.
     * @param args                                      Arguments to forward.
     */
    export const fork = (source?: string, ...args: string[]) => {
        // determine the base CLI path to be used for ts-bytenode
        const script = path.join(__dirname, '..', 'bin', 'CLI.js');

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
        Assert(fs.existsSync(filePath), 'Electron.js is not installed');

        // and can return as normal
        return filePath;
    };

    //  PRIVATE METHODS  //

    /**
     * Promisifies forked compilation results.
     * @param child                                 Forked child.
     * @param end                                   End handler.
     * @param exit                                  Exit handler.
     */
    const m_promisify = <T = unknown>(child: cp.ChildProcess, end: (data: Buffer) => T, exit: () => T) =>
        new Promise<T>((resolve, reject) => {
            // prepare the output data object
            let data = Buffer.alloc(0);

            // wait for any incoming data
            child.stdout?.on('end', () => resolve(end(data)));
            child.stdout?.on('error', (err) => console.error(err));
            child.stdout?.on('data', (chunk) => (data = Buffer.concat([data, chunk])));

            // display an ongoing error instances
            child.stderr?.on('error', (err) => console.error(err));
            child.stderr?.on('data', (chunk) => console.error(chunk.toString()));

            // and handle exit requests
            child.on('exit', () => resolve(exit()));
            child.on('error', (err) => reject(err));
        });
}
