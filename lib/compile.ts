/// Native Modules
import fs from 'fs';
import path from 'path';

/// Node Modules
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

    /********************
     *  PUBLIC METHODS  *
     ********************/

    /**
     * Compiles a given TypeScript project configuration source.
     * @param source                        TS-Config Source File.
     */
    export const project = (source?: string | ITSC): Cache => {
        // generate the underlying TS program
        const program = m_createProgram(source);

        // prepare the cached result
        const cache: Cache = new Map();
        const result = program.emit(undefined, m_interceptor(cache));

        // always generate the loggable diagnostics
        const diagnostics = ts.getPreEmitDiagnostics(program).concat(result.diagnostics);

        // log all the available diagnostics
        m_log(diagnostics);

        // depending on the diagnostics found, return the result
        return diagnostics.length ? new Map() : cache;
    };

    /*********************
     *  PRIVATE METHODS  *
     *********************/

    /**
     * Creates a TS program compiler toolchain.
     * @param source                                Source to convert to a TS program.
     */
    const m_createProgram = (source?: string | ITSC): ts.Program => {
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
            getNewLine: () => ts.sys.newLine
        };

        // and warn the user of any found diagnostics
        console.warn((pretty ? ts.formatDiagnosticsWithColorAndContext : ts.formatDiagnostics)(diagnostics, host));
    };

    /**
     * Constructs a write-file callback interceptor to cache output compilation results.
     * @param cache                                     Cache to write to.
     */
    const m_interceptor =
        (cache: Cache): ts.WriteFileCallback =>
        (fp, data, _, onError) => {
            try {
                if (fp.endsWith(ts.Extension.Js)) {
                    cache.set(fp.replace(ts.Extension.Js, ''), Bytecode.compile(data, true));
                } else ts.sys.writeFile(fp, data, _);
            } catch (err: any) {
                onError?.(err.message);
            }
        };
}
