/// Native Modules
import fs from 'fs';
import vm from 'vm';
import path from 'path';
import Module from 'module';

/// TSB Modules
import { Bytecode } from './bytecode';
import assert from 'assert';

//  TYPEDEFS  //

/** Application Context Mode. */
export type Mode = 'prod' | 'dev';

/** Augmenting Interface. */
export interface IAugmentation {
    extension?: `.${string}`;
    resolver?: (filePath: string) => string;
}

//  PROPERTIES  //

// need constant private access to the "Module" import
const MOD = Module as any;

/** Defaulted augmentation options. */
const m_options: Required<IAugmentation> = {
    extension: '.tsb',
    resolver: (fp) => fp,
};

//  PUBLIC METHODS  //

/** Ascertains the current running of the file. */
export const mode = function (): Mode {
    const err = new Error();
    Error.prepareStackTrace = (_, stack) => stack;
    const stack = err.stack as unknown as NodeJS.CallSite[];
    Error.prepareStackTrace = undefined;

    const fp = stack[1].getFileName() ?? '';
    return fp === 'evalmachine.<anonymous>' ? 'prod' : 'dev';
};

/**
 * Coordinates augmenting the process for launching "bytenode" files.
 * @param options                                       Augmentation options.
 */
export const augment = (options: IAugmentation = {}) => {
    // determine the base configuration to be used
    const { extension, resolver } = Object.assign({}, m_options, options);

    // ensure there is not already a value set
    assert(!MOD._extensions[extension], `Extension "${extension}" has already been applied to "NodeJS.require"`);

    // now we can actually augment the current extensions
    MOD._extensions[extension] = m_require(resolver);
};

//  PRIVATE METHODS  //

/**
 * Constructs a "require" augmentation.
 * @param resolver                          File-path resolver.
 */
const m_require = (resolver: NonNullable<IAugmentation['resolver']>) =>
    function (module: Module, filePath: string) {
        // pre-resolve the given file-name as necessary
        filePath = resolver(filePath);

        // check the file actually exists now
        assert(fs.existsSync(filePath), `Cannot require non-existent file "${filePath}"`);

        // re-compile to be launchable as necessary
        const bytecode = new Bytecode(fs.readFileSync(filePath), { filename: filePath, lineOffset: 0 });

        /***************************
         *  REQUIRE MODIFICATIONS  *
         ***************************/

        // base require function/object
        function require(id: string) {
            return module.require(id);
        }

        // ensure resolver is possible
        require.resolve = function (req: string, opts: any) {
            return MOD._resolveFilename(req, module, false, opts);
        };

        // make the extension augmentation globally available
        if (process.mainModule) require.main = process.mainModule;
        require.extensions = MOD._extensions;
        require.cache = MOD._cache;

        // finally allow within the current context
        const dirPath = path.dirname(filePath);
        const args = [module.exports, require, module, filePath, dirPath, process, global];

        // generate the module wrapper
        const wrapper = bytecode.launch({ filename: filePath, lineOffset: 0, columnOffset: 0, displayErrors: true });

        // and apply the arguments with a desired "this" value
        return wrapper.apply(module.exports, args);
    };
