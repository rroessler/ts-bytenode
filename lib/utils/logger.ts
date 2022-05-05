/// Node Modules.
import * as ts from 'typescript';

/** Logger Utility. */
export namespace Log {
    /********************
     *  PUBLIC METHODS  *
     ********************/

    /**
     * Logs input TS diagnostics.
     * @param diags                     Diagnostics.
     * @param pretty                    Pretty flag.
     */
    export const diagnostics = (diags: ts.Diagnostic[], pretty = false) => {
        // if no results then do nothing
        if (!diagnostics.length) return;

        // format the diagnostics host
        const formatHost: ts.FormatDiagnosticsHost = {
            getCanonicalFileName: (p) => p,
            getCurrentDirectory: ts.sys.getCurrentDirectory,
            getNewLine: () => ts.sys.newLine
        };

        // and warn the user of the found diagnostics
        const formatter = pretty ? ts.formatDiagnosticsWithColorAndContext : ts.formatDiagnostics;
        console.warn(formatter(diags, formatHost));
    };

    /***************
     *  COLORIZER  *
     ***************/

    /** Helper Chalk Utility. */
    export namespace Chalk {
        /// Denote if allowed to print color.
        const allow = !!ts.sys.writeOutputIsTTY && ts.sys.writeOutputIsTTY();

        /// Helper colorizer.
        const color = (esc: string) => (text: string) => allow ? `${esc}${text}\x1b[0m` : text;

        /********************
         *  PUBLIC METHODS  *
         ********************/

        export const grey = color.call(null, '\x1b[90m');
        export const red = color.call(null, '\x1b[91m');
        export const green = color.call(null, '\x1b[92m');
        export const yellow = color.call(null, '\x1b[93m');
        export const blue = color.call(null, '\x1b[94m');
        export const magenta = color.call(null, '\x1b[95m');
        export const cyan = color.call(null, '\x1b[96m');
    }
}
