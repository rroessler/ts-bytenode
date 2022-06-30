/// Native Modules
import fs from 'fs';
import path from 'path';
import { fork } from 'child_process';

/// Node Modules
import micromatch from 'micromatch';
import * as ts from 'typescript';

// TS-Bytenode Modules
import { ITSC } from './options';
import { Bytecode } from './codify';

/// TypeScript Compilation Library.
export namespace TSC {
    /**************
     *  TYPEDEFS  *
     **************/

    /** Compilation Output Cache. */
    export type Cache = Map<string, Buffer>;

    /** Compilation Additional Pipeline Modifiers. */
    export type Pipeline = Array<(input: string) => string>;

    /** Extra Compilation Options. */
    export interface IOptions {
        codegen?: boolean; // Whether to produce bytecode or regular output.
        outDir?: string; // Additional directory path to ADD onto $outDir.
        noCompile?: string | string[]; // Globstar patterns for files to not compile.
        pipeline?: Pipeline; // Available pipeline options.
    }

    /********************
     *  PUBLIC METHODS  *
     ********************/

    /**
     * Compiles a given TypeScript project configuration source.
     * @param source                        TS-Config Source File.
     * @param options                       Additional compilation options.
     */
    export const project = (source?: string | ITSC, options: IOptions = {}): Cache => {
        // generate the underlying TS program
        const program = m_createProgram(source, options);

        // prepare the cached result
        const cache: Cache = new Map();
        const total = program.getSourceFiles().length;

        // ensure there are actually any inputs
        if (total === 0) console.warn('tsb > Warning: Did not find any source files.');

        // destructure some additional output options
        const { outDir, ...intercepts } = options;

        // coordinate the actually compilation routine
        const result = program.emit(undefined, m_interceptor(cache, intercepts));

        // always generate the loggable diagnostics
        const diagnostics = ts.getPreEmitDiagnostics(program).concat(result.diagnostics);

        // log all the available diagnostics
        m_log(diagnostics);

        // depending on the diagnostics found, return the result
        return diagnostics.length || !total ? new Map() : cache;
    };

    /**
     * Compiles a given TypeScript project configuration source within an Electron-based context.
     * @param source                        TS-Config Source File.
     */
    export const electronify = async (source?: string, ...args: string[]): Promise<void> =>
        new Promise<void>((resolve, reject) => {
            const tsb_path = path.join(__dirname, 'CLI.js');
            const e_path = path.join(path.dirname(require.resolve('electron')), 'cli.js');
            if (!fs.existsSync(e_path)) throw new Error('Electron.js is not installed');

            // generate the subprocess in which to coordinate compilation
            const p = fork(e_path, [tsb_path, 'compile', source ?? '', ...args], {
                env: { ELECTRON_RUN_AS_NODE: '1' },
                stdio: ['inherit', 'pipe', 'pipe', 'ipc'],
            });

            if (p.stdout) {
                p.stdout.on('data', console.log);
                p.stdout.on('error', console.log);
                p.stdout.on('end', () => resolve());
            }

            if (p.stderr) {
                p.stderr.on('data', console.error);
                p.stderr.on('error', console.error);
            }

            p.addListener('message', console.log);
            p.addListener('error', console.error);

            p.on('error', reject);
            p.on('exit', resolve);
        });

    /*********************
     *  PRIVATE METHODS  *
     *********************/

    /**
     * Creates a TS program compiler toolchain.
     * @param source                                Source to convert to a TS program.
     * @param params                                Additional compilation parameters.
     */
    const m_createProgram = (source?: string | ITSC, params: IOptions = {}): ts.Program => {
        // determine the base program path
        const basePath = typeof source === 'string' ? path.dirname(source) : process.cwd();
        let config = source as ITSC; // pre-cast as configuration values

        // resolve the configuration if required
        if (typeof source === 'string' || typeof source === 'undefined') {
            // resolve the configuration path
            const name = source?.endsWith('.json') ? path.basename(source) : 'tsconfig.json';
            const fp = ts.findConfigFile(basePath, ts.sys.fileExists, name);

            // if no valid configuration path, chuck a wobbly
            if (!fp) throw new ReferenceError('Could not resolve valid "tsconfig" file.');

            // valid file so parse into the relevant config variable
            config = JSON.parse(fs.readFileSync(fp, 'utf-8')) as ITSC;
        }

        // resolve the `tsconfig` object into suitable program data
        const { options, fileNames, projectReferences } = ts.parseJsonConfigFileContent(config, ts.sys, basePath);

        // modify the output directory as necessary
        options.outDir = path.join(options.outDir ?? basePath, params.outDir ?? '');

        // and creating the program toolchain as needed
        return ts.createProgram({ options, projectReferences, rootNames: fileNames });
    };

    /**
     * Diagnostics logger. If any diagnostics are found, they are emitted onto the console.
     * @param diagnostics                                   Diagnostics to log.
     * @param pretty                                        Prettification flag.
     */
    const m_log = (diagnostics: ts.Diagnostic[], pretty = !!ts.sys.writeOutputIsTTY && ts.sys.writeOutputIsTTY()) => {
        // if no results then do nothing
        if (!diagnostics.length) return;

        // format the diagnostics host
        const host: ts.FormatDiagnosticsHost = {
            getCanonicalFileName: (fp) => fp,
            getCurrentDirectory: ts.sys.getCurrentDirectory,
            getNewLine: () => ts.sys.newLine,
        };

        // and warn the user of any found diagnostics
        console.warn((pretty ? ts.formatDiagnosticsWithColorAndContext : ts.formatDiagnostics)(diagnostics, host));
    };

    /**
     * Constructs a write-file callback interceptor to cache output compilation results.
     * @param cache                                     Cache to write to.
     */
    const m_interceptor = (cache: Cache, options: Omit<IOptions, 'outDir'>): ts.WriteFileCallback => {
        // destructure the given interceptor options
        const { noCompile, codegen, pipeline } = options;

        // setup a compilation matcher
        const allow = noCompile
            ? (fp: string) =>
                  (codegen ?? true) && fp.endsWith(ts.Extension.Js) && !micromatch.isMatch(path.basename(fp), noCompile)
            : (fp: string) => (codegen ?? true) && fp.endsWith(ts.Extension.Js);

        // setup a pipe-line if given
        const transform = (data: string) => (pipeline ?? []).reduce((a, cb) => cb(a), data);

        // and return the constructed interceptor
        return (fp, data, _, onError) => {
            try {
                // ensure the data is transformed
                data = transform(data);

                // if not compiling further, then just write (as is non-JS file)
                if (!allow(fp)) return ts.sys.writeFile(fp, data, _);

                // otherwise coordinate a compilation
                const buffer = codegen ?? true ? Bytecode.compile(data, true) : Buffer.from(data);
                cache.set(fp.replace(ts.Extension.Js, ''), buffer);
            } catch (err: any) {
                onError?.(err.message);
            }
        };
    };
}
