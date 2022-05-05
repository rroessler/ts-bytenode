/** TypeScript Configuration Options. */
export interface IConfigOptions {
    compilerOptions?: IConfigCompilerOptions;
    include?: string[];
    exclude?: string[];
    files?: string[];
    extends?: string;
    references?: { path: string }[];
}

/** Compilation Options */
export interface IConfigCompilerOptions {
    allowJs?: boolean;
    allowSyntheticDefaultImports?: boolean;
    allowUmdGlobalAccess?: boolean;
    allowUnreachableCode?: boolean;
    allowUnusedLabels?: boolean;
    alwaysStrict?: boolean;
    // assumeChangesOnlyAffectDirectDependencies?: boolean;
    baseUrl?: string;
    charset?: string;
    checkJs?: boolean;
    composite?: boolean;
    declaration?: boolean;
    declarationDir?: string;
    declarationMap?: boolean;
    diagnostics?: boolean;
    disableReferencedProjectLoad?: boolean;
    disableSizeLimit?: boolean;
    disableSolutionSearching?: boolean;
    downlevelIteration?: boolean;
    emitBOM?: boolean;
    emitDeclarationOnly?: boolean;
    emitDecoratorMetadata?: boolean;
    esModuleInterop?: boolean;
    experimentalDecorators?: boolean;
    extendedDiagnostics?: boolean;
    // fallbackPolling?: 'dynamicPriorityPolling' | 'fixedPollingInterval' | 'priorityPollingInterval'
    forceConsistentCasingInFileNames?: boolean;
    // generateCpuProfile?: string
    importHelpers?: boolean;
    importsNotUsedAsValues?: 'error' | 'preserve' | 'remove';
    incremental?: boolean;
    inlineSourceMap?: boolean;
    inlineSources?: boolean;
    isolatedModules?: boolean;
    jsx?: 'preserve' | 'react' | 'react-native';
    jsxFactory?: string;
    jsxFragmentFactory?: string;
    jsxImportSource?: string;
    keyofStringsOnly?: boolean;
    lib?: Array<
        | 'DOM'
        | 'DOM.iterable'
        | 'ES2015'
        | 'ES2015.collection'
        | 'ES2015.core'
        | 'ES2015.generator'
        | 'ES2015.iterable'
        | 'ES2015.promise'
        | 'ES2015.proxy'
        | 'ES2015.reflect'
        | 'ES2015.symbol'
        | 'ES2015.symbol.wellknown'
        | 'ES2016'
        | 'ES2016.array.include'
        | 'ES2017'
        | 'ES2017.intl'
        | 'ES2017.object'
        | 'ES2017.sharedmemory'
        | 'ES2017.string'
        | 'ES2017.typedarrays'
        | 'ES2018'
        | 'ES2018.asynciterable'
        | 'ES2018.intl'
        | 'ES2018.promise'
        | 'ES2018.regexp'
        | 'ES2019'
        | 'ES2019.array'
        | 'ES2019.object'
        | 'ES2019.string'
        | 'ES2019.symbol'
        | 'ES2020'
        | 'ES2020.string'
        | 'ES2020.symbol.wellknown'
        | 'ES5'
        | 'ES6'
        | 'ES7'
        | 'ESNext'
        | 'ESNext.array'
        | 'ESNext.asynciterable'
        | 'ESNext.bigint'
        | 'ESNext.intl'
        | 'ESNext.symbol'
        | 'scripthost'
        | 'webworker'
    >;
    listEmittedFiles?: boolean;
    listFiles?: boolean;
    // listFilesOnly?: boolean
    mapRoot?: string;
    maxNodeModuleJsDepth?: number;
    module?: 'none' | 'CommonJS' | 'AMD' | 'system' | 'UMD' | 'ES6' | 'ES2015' | 'ES2020' | 'ESNext';
    moduleResolution?: 'node' | 'classic';
    newLine?: 'CRLF' | 'LF';
    noEmit?: boolean;
    noEmitHelpers?: boolean;
    noEmitOnError?: boolean;
    noErrorTruncation?: boolean;
    noFallthroughCasesInSwitch?: boolean;
    noImplicitAny?: boolean;
    noImplicitReturns?: boolean;
    noImplicitThis?: boolean;
    noImplicitUseStrict?: boolean;
    noLib?: boolean;
    noResolve?: boolean;
    noStrictGenericChecks?: boolean;
    noUncheckedIndexedAccess?: boolean;
    noUnusedLocals?: boolean;
    noUnusedParameters?: boolean;
    outDir?: string;
    outFile?: string;
    paths?: { [key: string]: string[] };
    plugins?: Array<{
        name?: string;
    }>;
    preserveConstEnums?: boolean;
    preserveSymlinks?: boolean;
    pretty?: boolean;
    reactNamespace?: string;
    removeComments?: boolean;
    resolveJsonModule?: boolean;
    rootDir?: string;
    rootDirs?: string[];
    skipDefaultLibCheck?: boolean;
    skipLibCheck?: boolean;
    sourceMap?: boolean;
    sourceRoot?: string;
    strict?: boolean;
    strictBindCallApply?: boolean;
    strictFunctionTypes?: boolean;
    strictNullChecks?: boolean;
    strictPropertyInitialization?: boolean;
    stripInternal?: boolean;
    suppressExcessPropertyErrors?: boolean;
    suppressImplicitAnyIndexErrors?: boolean;
    target?: 'ES3' | 'ES5' | 'ES6' | 'ES2015' | 'ES2016' | 'ES2017' | 'ES2018' | 'ES2019' | 'ES2020' | 'ESNext';
    traceResolution?: boolean;
    tsBuildInfoFile?: string;
    typeRoots?: string[];
    types?: string[];
    useDefineForClassFields?: boolean;
}
