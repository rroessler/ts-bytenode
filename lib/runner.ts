/// Native Modules
import * as vm from 'vm';
import * as path from 'path';

/// ts-bytenode Imports
const pkg = require(path.join(__dirname, '../package.json'));
import { Compile } from './compile';

/** Runner Functionality. */
export namespace Runner {
    /****************
     *  PROPERTIES  *
     ****************/

    /** V8.8 / V8.9 Node Versions. */
    const V8 = ['v8.8', 'v8.9'];

    /** LTS Versions. */
    const LTS = ['v12', 'v13', 'v14', 'v15', 'v16', 'v17', 'v18'];

    /********************
     *  PUBLIC METHODS  *
     ********************/

    /**
     * Launches an assumed set of V8 bytecode.
     * @param bytecode                      Buffered bytecode.
     */
    export const launch = <T extends any = any>(bytecode: Buffer) => scriptify(bytecode).runInThisContext() as T;

    /**
     * Converts given bytecode into a suitable runner script.
     * @param bytecode                      Bytecode to convert to a script.
     */
    export const scriptify = (bytecode: Buffer): vm.Script => {
        // fix up the current bytecode
        const result = Utils.fix(bytecode);

        // generate the V8 script
        const script = new vm.Script(result.dummy, { cachedData: result.buffer });

        // ensure we have a valid script
        Utils.assertScript(script);

        // and return the resulting script
        return script;
    };

    /***************
     *  UTILITIES  *
     ***************/
    /** Utility Methods. */
    export namespace Utils {
        /**
         * Core fixer method to ensure bytecode is valid on current system.
         * @param buffer                        Bytecode buffer to fix.
         */
        export const fix = (buffer: Buffer): { buffer: Buffer; dummy: string } => {
            // fix up the current bytecode to the required version
            m_fix(buffer);

            // determine the source code length
            const len = m_length(buffer);

            // pad out some dummy code for building the script
            return { buffer, dummy: len <= 1 ? '' : `"${'\u200b'.repeat(len - 2)}"` };
        };

        /**
         * Asserts a "vm.Script" for valid cache data.
         * @param script                        Script to assert.
         */
        export const assertScript = (script: vm.Script) => {
            if (!script.cachedDataRejected) return;
            throw new Error('ts-bytenode | Invalid or incompatible cached data!');
        };

        /*********************
         *  PRIVATE METHODS  *
         *********************/

        /**
         * Fixes input bytecode to work in the current context.
         * @param buffer                        Buffered bytecode.
         */
        const m_fix = (buffer: Buffer) => {
            // prepare some dummy bytecode
            const dummy = Compile.raw(`"ts-bytenode : v${pkg.version}"`) as Buffer;

            // modify the required version as necessary
            if (V8.some((v) => process.version.startsWith(v))) {
                dummy.slice(16, 20).copy(buffer, 16);
                dummy.slice(20, 24).copy(buffer, 20);
            } else if (LTS.some((v) => process.version.startsWith(v))) {
                dummy.slice(12, 16).copy(buffer, 12);
            } else {
                dummy.slice(12, 16).copy(buffer, 12);
                dummy.slice(16, 20).copy(buffer, 16);
            }
        };

        /**
         * Determines the source hash length of a given bytecode input.
         * @param buffer                        Buffered bytecode.
         */
        const m_length = (buffer: Buffer) => {
            const [s, e] = V8.some((v) => process.version.startsWith(v)) ? [12, 16] : [8, 12];
            return buffer.slice(s, e).reduce((a, n, p) => (a += n * Math.pow(256, p)), 0);
        };
    }
}
