/// Native Modules
import vm from 'vm';
import path from 'path';
import Module from 'module';

/** Bytecode Generation Library. */
export namespace Bytecode {
    /****************
     *  PROPERTIES  *
     ****************/

    /// Node Bytecode Versioning.
    namespace V {
        /** V8.8 / V8.9 Node Versions. */
        export const OLD = ['v8.8', 'v8.9'];

        /** LTS Versions. */
        export const LTS = ['v12', 'v13', 'v14', 'v15', 'v16', 'v17', 'v18'];
    }

    /********************
     *  PUBLIC METHODS  *
     ********************/

    /**
     * Converts JS code input to the V8 bytecode equivalent before being able to run.
     * @param code                              Code to compile.
     * @param isModule                          Module flag.
     */
    export const compile = (code: string, isModule = false): Buffer =>
        new vm.Script(isModule ? Module.wrap(code) : code, { produceCachedData: true }).createCachedData();

    /**
     * Launches a given V8 bytecode buffer safely.
     * @param buffer                            Bytecode to launch.
     */
    export const launch = <T = any>(buffer: Buffer): T => {
        const result = Utils.fix(buffer); // fix up the buffer for execution
        const script = new vm.Script(result.dummy, { cachedData: result.buffer });
        Utils.assert(script); // ensure valid script output
        return script.runInThisContext();
    };

    /***************
     *  UTILITIES  *
     ***************/

    /** Utility Methods. */
    export namespace Utils {
        /********************
         *  PUBLIC METHODS  *
         ********************/

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
        export const assert = (script: vm.Script) => {
            if (!script.cachedDataRejected) return;
            throw new Error('Invalid or incompatible cached data');
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
            const dummy = compile('"ಠ_ಠ"') as Buffer;

            // modify the required version as necessary
            if (V.OLD.some((v) => process.version.startsWith(v))) {
                dummy.slice(16, 20).copy(buffer, 16);
                dummy.slice(20, 24).copy(buffer, 20);
            } else if (V.LTS.some((v) => process.version.startsWith(v))) {
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
            const [s, e] = V.OLD.some((v) => process.version.startsWith(v)) ? [12, 16] : [8, 12];
            return buffer.slice(s, e).reduce((a, n, p) => (a += n * Math.pow(256, p)), 0);
        };
    }
}
