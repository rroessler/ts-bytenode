/// Native Modules
import * as fs from 'fs';
import * as vm from 'vm';
import * as path from 'path';
import * as Module from 'module';

/// TS-Bytenode Imports
import { Runner as _Runner_impl } from './runner';
import { Compile as _Compile_impl } from './compile';
import { IConfigOptions as _IConfigOptions_impl } from './tsconfig';

/** TS-Bytenode Namespace. */
namespace tsb {
    /**************
     *  TYPEDEFS  *
     **************/

    /** Configuration Options. */
    export type IConfigOptions = _IConfigOptions_impl;

    /** Custom File Resolution Function. */
    export type Resolver = (filename: string) => string;

    /** Augmentation Options. */
    export interface IAugmentation {
        extension?: `.${string}`;
        resolver?: Resolver;
    }

    /****************
     *  PROPERTIES  *
     ****************/

    export const Runner = _Runner_impl;
    export const Compile = _Compile_impl;

    /********************
     *  PUBLIC METHODS  *
     ********************/

    /**
     * Augments the current Node JS process to allow for loading `.tsc` bytenode files.
     * @param options                                   Augmentation options.
     */
    export const augment = (options: IAugmentation = {}) => {
        // default the options we have
        const augs: Required<IAugmentation> = Object.assign(
            { extension: '.tsc', resolver: (fp: string) => fp },
            options
        );

        // declare a reference to the base `Module` instance (to get around TS errors)
        const MOD = Module as any;

        // augment the current extensions
        MOD._extensions[augs.extension] = function (mod: Module, filename: string) {
            // pre-resolve the given input file
            filename = augs.resolver(filename);

            // re-compile as per normal
            const buffer = fs.readFileSync(filename);
            const result = Runner.Utils.fix(buffer);

            // generate the script for the current context
            const script = new vm.Script(result.dummy, {
                filename,
                lineOffset: 0,
                displayErrors: true,
                cachedData: result.buffer
            });

            // ensure the script is valid
            Runner.Utils.assertScript(script);

            /***************************
             *  REQUIRE MODIFICATIONS  *
             ***************************/

            /** Require implementation. */
            function require(id: string) {
                return mod.require(id);
            }

            /// Resolve implementation
            require.resolve = function (req: string, opts: any) {
                return MOD._resolveFilename(req, mod, false, opts);
            } as RequireResolve;

            // make the extension globally accessible
            if (process.mainModule) require.main = process.mainModule;
            require.extensions = (<any>Module)._extensions;
            require.cache = (<any>Module)._cache;

            // finally allow the use of the current context
            const dirname = path.dirname(filename);
            const args = [mod.exports, require, mod, filename, dirname, process, global];
            const wrapper = script.runInThisContext({
                filename,
                lineOffset: 0,
                columnOffset: 0,
                displayErrors: true
            });

            // finally run as intended
            return wrapper.apply(mod.exports, args);
        };
    };
}

/// Exports
export default tsb;
