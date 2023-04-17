/// Node Modules
import fs from 'fs';
import path from 'path';

/// Library Modules
import * as ts from 'typescript';

/** Import Functionality for Singular TS Files. */
export namespace Import {
    //  PROPERTIES  //

    const m_defaults: ts.TranspileOptions = {
        compilerOptions: {
            module: ts.ModuleKind.ES2020,
            moduleResolution: ts.ModuleResolutionKind.NodeJs,
            target: ts.ScriptTarget.ES2020
        }
    };

    //  PUBLIC METHODS  //

    /**
     * Coordinates synchronous requiring of typescript files.
     * @param tsRelativePath                                    Relative path to use.
     * @param options                                           Transpilation options.
     */
    export const require = <T = unknown>(tsRelativePath: string, options: ts.TranspileOptions = {}): T =>
        Provider.require(m_resolve(tsRelativePath, options));

    /**
     * Coordinates asynchronous loading of typescript files.
     * @param tsRelativePath                                    Relative path to use.
     * @param options                                           Transpilation options.
     */
    export const load = async <T = unknown>(tsRelativePath: string, options: ts.TranspileOptions = {}): Promise<T> =>
        Provider.load(m_resolve(tsRelativePath, options));

    //  PRIVATE METHODS  //

    /**
     * Resolves provider options as necessary.
     * @param tsRelativePath                                    Relative path to use.
     * @param options                                           Transpilation options.
     */
    const m_resolve = (tsRelativePath: string, options: ts.TranspileOptions = {}): Provider.IOptions => {
        // update the underlying options to be used
        options = Object.assign({}, m_defaults, options);

        // determine some details about the program
        const cwd = process.cwd();
        const tsPath = path.join(cwd, tsRelativePath);
        const cacheDir = path.join(cwd, '.cache', 'ts-import');
        const jsAfterCacheDir = process.platform === 'win32' ? tsPath.split(':')[1]! : tsPath;
        const jsPath = path.join(cacheDir, jsAfterCacheDir).replace(/\.[^/.]+$/u, '.js');

        // return the resulting provider options
        return { tsPath, jsPath, options };
    };
}

export namespace Import.Provider {
    //  TYPEDEFS  //

    export interface IOptions {
        tsPath: string;
        jsPath: string;
        options: ts.TranspileOptions;
    }

    //  PUBLIC METHODS  //

    /**
     * Coordinates importing a Typescript module.
     * @param options                                   Provider options.
     */
    export const load = async ({ tsPath, jsPath, options }: IOptions): Promise<any> => {
        const source = await fs.promises.readFile(tsPath, 'utf-8');
        const transpiled = ts.transpileModule(source, options);
        await fs.promises.mkdir(path.dirname(jsPath), { recursive: true });
        await fs.promises.writeFile(jsPath, transpiled.outputText);

        // and lastly coordinate the required import instance
        return import(jsPath);
    };

    /**
     * Coordinates requiring a Typescript module.
     * @param options                                   Provider options.
     */
    export const require = ({ tsPath, jsPath, options }: IOptions): any => {
        const source = fs.readFileSync(tsPath, 'utf-8');
        const transpiled = ts.transpileModule(source, options);
        fs.mkdirSync(path.dirname(jsPath), { recursive: true });
        fs.writeFileSync(jsPath, transpiled.outputText);

        // and lastly coordinate the required import instance
        return global.require(jsPath);
    };
}
