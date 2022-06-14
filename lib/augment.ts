/// Native Modules
import fs from 'fs';
import vm from 'vm';
import path from 'path';
import Module from 'module';

/// TS-Bytenode Modules
import { Bytecode } from './codify';

/**************
 *  TYPEDEFS  *
 **************/

/** Augmentation Options. */
interface IAugmentor {
    ext?: `.{string}`;
    resolver?: (filePath: string) => string;
}

/********************
 *  PUBLIC METHODS  *
 ********************/

/// Gets the current execution mode.
export const mode = function (): 'prod' | 'dev' {
    const err = new Error();
    Error.prepareStackTrace = (_, stack) => stack;
    const stack = err.stack as unknown as NodeJS.CallSite[];
    Error.prepareStackTrace = undefined;

    const fp = stack[1].getFileName() ?? '';
    return (process.env.TSB_LIST?.split(';') ?? []).some((ext) => fp.endsWith(ext)) ? 'prod' : 'dev';
};

/**
 * Modifies the current context to allow loading in `.tsb` bytecode files.
 * @param opts                              Augmentation options.
 */
export const augment = (opts: IAugmentor = {}) => {
    // define the base configuration required
    const conf: Required<IAugmentor> = Object.assign({ ext: '.tsb', resolver: (fp: string) => fp }, opts);

    // need private access to the `Module` import so declare as any
    const MOD = Module as any;

    // ensure the extension has not already been set
    if (MOD._extensions[conf.ext]) {
        throw ReferenceError(`Extension "${conf.ext}" has already been applied to NodeJS.require`);
    }

    // add the available extension to the TSB list
    if (process.env.TSB_LIST === undefined) process.env.TSB_LIST = `${conf.ext}`;
    else process.env.TSB_LIST += `;${conf.ext}`;

    // augment the current extensions
    MOD._extensions[conf.ext] = function (module: Module, fp: string) {
        fp = conf.resolver(fp); // pre-resolve the given file-name

        // check the the file actually exists now
        if (!fs.existsSync(fp)) throw ReferenceError('Augmentor input file does not exist.');

        // recompile to the necessary usage
        const result = Bytecode.Utils.fix(fs.readFileSync(fp));

        // generate the script differently for launching now
        const script = new vm.Script(result.dummy, {
            filename: fp,
            lineOffset: 0,
            displayErrors: true,
            cachedData: result.buffer
        });

        // ensure the script is valid again
        Bytecode.Utils.assert(script);

        /***************************
         *  REQUIRE MODIFICATIONS  *
         ***************************/

        /** Base Required Implemenation. */
        function require(id: string) {
            return module.require(id);
        }

        /** Base Resolve Implemenation. */
        require.resolve = function (req: string, opts: any) {
            return MOD._resolveFilename(req, module, false, opts);
        } as RequireResolve;

        // make the extension augmentation globally available
        if (process.mainModule) require.main = process.mainModule;
        require.extensions = MOD._extensions;
        require.cache = MOD._cache;

        // finally allow use within the current context
        const dir = path.dirname(fp);
        const args = [module.exports, require, module, fp, dir, process, global];

        // generate the script wrapper
        const wrapper = script.runInThisContext({
            filename: fp,
            lineOffset: 0,
            columnOffset: 0,
            displayErrors: true
        });

        // and finally run as expected
        return wrapper.apply(module.exports, args);
    };
};
