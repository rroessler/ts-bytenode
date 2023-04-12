/// Node Modules
import fs from 'fs';
import path from 'path';
import assert from 'assert';

/// Library Modules
import * as ts from 'typescript';
import micromatch from 'micromatch';
import { type TSConfigJSON } from 'types-tsconfig';

/// TSB Modules
import { Bytecode } from './bytecode';

//  TYPEDEFS  //

/** Compilation Output Cache. */
export type Cache = Map<string, Buffer>;

/** Pipeline Handlers Typing. */
export type Pipeline = (input: string) => string;

/** Compilation Options Interface. */
export interface IOptions<P extends string | Pipeline = Pipeline> {
    pipeline?: P extends string ? P : P | P[];
    outDir?: string;
    rootPath?: string;
    codegen?: boolean;
    ignore?: string | string[];
}

//  IMPLEMENTATIONS  //

/** Helper Compilation Interceptor. */
export class Interceptor {
    //  PROPERTIES  //

    /** The current output cache instance. */
    readonly cache: Cache = new Map();

    /** The underlying interceptor options. */
    private m_options: Pick<IOptions, 'codegen' | 'ignore' | 'pipeline'>;

    //  GETTERS x SETTERS  //

    /** Returns a bound interception handler. */
    get handler() {
        return this.transform.bind(this);
    }

    /** Gets the underlying pipeline instance. */
    get pipeline() {
        // get the base pipeline instance
        const pl = this.m_options.pipeline;

        // return an empty array immediately if necessary
        if (typeof pl === 'undefined') return [];

        // otherwise resolve into a suitable array instance
        return typeof pl === 'function' ? [pl] : pl;
    }

    //  CONSTRUCTORS  //

    /**
     * Constructs a simple interceptor instance.
     * @param options                               Options to use.
     */
    constructor(options: Pick<IOptions, 'codegen' | 'ignore' | 'pipeline'> = {}) {
        // pull out the required options to be used
        const { codegen, ignore, pipeline } = options;

        // and save them as necessary
        this.m_options = { codegen, ignore, pipeline };
    }

    //  PUBLIC METHODS  //

    /**
     * Coordinates handling transformation of incoming requests.
     * @param filePath                              File to check.
     * @param data                                  Data to transform.
     * @param _                                     [Ignored parameter]
     * @param onError                               Error handler.
     */
    transform(filePath: string, data: string, _: boolean, onError?: (message: string) => void) {
        try {
            // ensure the data has been properly transformed
            data = this.pipeline.reduce((a, cb) => cb(a), data);

            // if not compiling further then just ignore the file
            if (!this.m_allowed(filePath)) return;

            // otherwise complete a full compilation instance
            const buffer = this.m_options.codegen ?? true ? new Bytecode(data, {}).buffer : Buffer.from(data);

            // and update the cache with this current instance
            this.cache.set(filePath.replace(ts.Extension.Js, ''), buffer);
        } catch (err: any) {
            onError?.(err.message);
        }
    }

    //  PRIVATE METHODS  //

    /**
     * Checks if a file-path is valid for compilation.
     * @param filePath                              File to assert.
     */
    private m_allowed(filePath: string) {
        // pull out the ignore list for the interceptor
        const { ignore } = this.m_options;

        // determine if initially verified as valid
        const valid = filePath.endsWith(ts.Extension.Js);

        // and then return the result
        return valid && (ignore ? !micromatch.isMatch(path.basename(filePath), ignore) : true);
    }
}

//  PUBLIC METHODS  //

/**
 * Compiles a given Typescript project.
 * @param source                            Configuration source.
 * @param options                           Compilation options.
 */
export const project = (source?: string | Program.IConfig, options: IOptions = {}): Cache => {
    // generate an underlying typescript program instance
    const program = Program.create(source, options);

    // prepare the interceptor to be used for caching
    const interceptor = new Interceptor(options);

    // determine how many files we will produce in the end
    const total = program.getSourceFiles().length;

    // ensure there are some outputs to compile, otherwise declare that an error has occured
    if (total === 0) return console.warn('TSB > Could not find any source files'), new Map();

    // attempt running a result of the project compilation
    const result = program.emit(undefined, interceptor.handler);

    // always generate the loggable diagnostics
    const diagnostics = ts.getPreEmitDiagnostics(program).concat(result.diagnostics);

    // check to the total number of errors
    const errors = diagnostics.reduce((a, { category }) => a + +(category === ts.DiagnosticCategory.Error), 0);

    // log all available diagnostics
    m_log(diagnostics);

    // throw an error if necessary
    assert(!errors, 'TSB > Failed to compile project');

    // return the intercepted outputs
    return interceptor.cache;
};

//  PRIVATE METHODS  //

/**
 * Coordinates logging diagnostic results.
 * @param diagnostics                           Diagnostics to log.
 * @param pretty                                Whether to pretty print.
 */
const m_log = (diagnostics: ts.Diagnostic[], pretty = !!ts.sys.writeOutputIsTTY && ts.sys.writeOutputIsTTY()) => {
    // if there are no diagnostics, then ignore
    if (!diagnostics.length) return;

    // format the diagnostics host
    const host: ts.FormatDiagnosticsHost = {
        getNewLine: () => ts.sys.newLine,
        getCanonicalFileName: (filePath) => filePath,
        getCurrentDirectory: () => ts.sys.getCurrentDirectory(),
    };

    // and alert the user based on the results
    console.error((pretty ? ts.formatDiagnosticsWithColorAndContext : ts.formatDiagnostics)(diagnostics, host));
};

/** Program Generation Functionality. */
export namespace Program {
    //  TYPEDEFS  //

    /** "tsconfig.json" Interface. */
    export interface IConfig extends TSConfigJSON {}

    //  PUBLIC METHODS  //

    /**
     * Attempts to create a valid Typescript program for compilation.
     * @param source                            Source configuration.
     * @param options                           Program options.
     */
    export const create = (source?: string | IConfig, options: Pick<IOptions, 'outDir' | 'rootPath'> = {}) => {
        // determine a suitable base path to be used from a defined root
        const basePath = options.rootPath ?? (typeof source === 'string' ? path.dirname(source) : process.cwd());

        // resolve the configuration instance if necessary
        const config = typeof source === 'object' ? source : IConfig.resolve(basePath, source);

        // now we can resove the `tsconfig` object into suitable program data
        const { projectReferences, ...parsed } = ts.parseJsonConfigFileContent(config, ts.sys, basePath);

        // modify the output directory as necessary
        parsed.options.outDir = path.join(parsed.options.outDir ?? basePath, options.outDir ?? '');

        // and create the program toolchain as necessary
        return ts.createProgram({ options: parsed.options, projectReferences, rootNames: parsed.fileNames });
    };
}

export namespace Program.IConfig {
    //  PUBLIC METHODS  //

    /**
     * Coordinates resolving configuration details.
     * @param basePath                          Base program path.
     * @param source                            Source file location.
     */
    export const resolve = (basePath: string, source?: string) => {
        // attempt determine a name of the file
        const fileName = source?.endsWith('.json') ? path.basename(source) : 'tsconfig.json';
        const filePath = ts.findConfigFile(basePath, ts.sys.fileExists, fileName);

        // if a valid file exists, then read the file in question
        assert(filePath, 'TSC > Could not resolve valid "tsconfig" file');

        // valid so we can return as necessary
        return JSON.parse(fs.readFileSync(filePath, 'utf-8')) as IConfig;
    };
}
