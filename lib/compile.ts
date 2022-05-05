/// Native Modules
import * as fs from 'fs';
import * as vm from 'vm';
import * as path from 'path';
import { wrap } from 'module';

/// Node Modules
import * as ts from 'typescript';

/// TS-Bytenode Imports
import { IConfigOptions } from './tsconfig';
import { Log } from './utils/logger';

/** Compilation Functionality. */
export namespace Compile {
    /**************
     *  TYPEDEFS  *
     **************/

    /** Compilation Output Cache. */
    export type Cache = Map<string, Buffer>;

    /********************
     *  PUBLIC METHODS  *
     ********************/

    /**
     * Compiles JavaScript code to its V8 bytecode equivalent.
     * @param code                          Code to compile.
     * @param isModule                      If the input code is a module.
     */
    export const raw = (code: string, isModule = false): Buffer =>
        new vm.Script(isModule ? wrap(code) : code, { produceCachedData: true }).createCachedData();

    /**
     * Compiles a given TS project source (config file or options) to the relevant
     * V8 bytecode equivalents.
     * @param source                            Configuration source (or options).
     */
    export const project = (source?: string | IConfigOptions): Cache => {
        // generate the underlying TS program
        const program = m_createProgram(source);

        // prepare the result cache
        const cache: Cache = new Map();
        const result = program.emit(undefined, m_interceptor(cache));

        // always log the current diagnostics
        const diags = ts.getPreEmitDiagnostics(program).concat(result.diagnostics);

        // regardless of the results log the diagnostics we have
        Log.diagnostics(diags);

        // depending on the total diagnostics, return a resulting cache
        return diags.length ? new Map() : cache;
    };

    /*********************
     *  PRIVATE METHODS  *
     *********************/

    /**
     * Creates a TS program generator instance.
     * @param source                            Configuration source (or options).
     */
    const m_createProgram = (source?: string | IConfigOptions): ts.Program => {
        // determine the base program path
        const basePath = typeof source === 'string' ? path.dirname(source) : process.cwd();
        let tsconf = source as IConfigOptions; // pre-cast the source as valid a tsconfig

        // resolve the configuration if given a string
        if (typeof source === 'string' || typeof source === 'undefined') {
            // resolve the configuration path
            const name = source?.endsWith('.json') ? path.basename(source) : 'tsconfig.json';
            const fp = ts.findConfigFile(basePath, ts.sys.fileExists, name);

            // if no valid configuration path, chuck a wobbly
            if (!fp) throw new ReferenceError('ts-bytenode | Could not resolve valid "tsconfig" file.');

            // valid file so parse into the relevant config variable
            tsconf = JSON.parse(fs.readFileSync(fp, 'utf-8')) as IConfigOptions;
        }

        // resolve the "tsconfig" object into suitable program data
        const { options, fileNames, projectReferences } = ts.parseJsonConfigFileContent(tsconf, ts.sys, basePath);

        // create the required program
        return ts.createProgram({ options, projectReferences, rootNames: fileNames });
    };

    /**
     * Constructs an interceptor function to retrieve compiled TS files.
     * @param cache                             Compilation output cache.
     */
    const m_interceptor =
        (cache: Cache): ts.WriteFileCallback =>
        (fileName, data, _, onError) => {
            try {
                if (fileName.endsWith(ts.Extension.Js)) cache.set(fileName, raw(data, true));
                else ts.sys.writeFile(fileName, data, _);
            } catch (err: any) {
                onError?.(err.message);
            }
        };

    /***************
     *  UTILITIES  *
     ***************/

    /** Compilation Utilities. */
    export namespace Utils {
        /**
         * Writes a file with given bytecode buffer.
         * @param fp                            File name.
         * @param data                          Data to write.
         * @param ext                           Extension to overwrite.
         */
        export const writeFile = (fp: string, data: Buffer, ext = '.tsc') => {
            const dir = path.dirname(fp);
            if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
            fs.writeFileSync(path.format({ ...path.parse(fp), base: '', ext }), data);
        };
    }
}
