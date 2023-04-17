/// Node Modules
import vm from 'vm';
import Module from 'module';

/// TSB Modules
import { Assert } from './assert';
const pkg = require('../package.json');

/** Bytecode Wrapper Class. */
export class Bytecode<T = any> {
    //  PROPERTIES  //

    /** The current script buffer instance. */
    private m_buffer: Buffer;

    /** A script instance of the underlying buffer. */
    private m_script: vm.Script;

    /** The buffers length property. */
    readonly length: number;

    /** The code necessary for launching scripts. */
    readonly dummy: string;

    //  GETTERS x SETTERS  //

    /** Returns an immutable buffer reference. */
    get buffer() {
        const clone = Buffer.alloc(this.m_buffer.length);
        return this.m_buffer.copy(clone), clone;
    }

    /** Returns if the bytecode is valid. */
    get valid() {
        return !this.m_script.cachedDataRejected;
    }

    //  CONSTRUCTORS  //

    /**
     * Constructs a bytecode instance.
     * @param code                          Code to compile.
     * @param options                       Script options.
     * @param isModule                      Optional module flag.
     */
    constructor(
        code: string | Buffer,
        options: Omit<vm.ScriptOptions, 'cachedData'> = {},
        readonly isModule: boolean = false
    ) {
        // compile the code given
        this.m_buffer = code instanceof Buffer ? code : Bytecode.Utils.compile(code, isModule);

        // determine the buffer length now
        this.length = Bytecode.Utils.length(this.m_buffer);

        // and generate the dummy code for launch scripts
        this.dummy = this.length <= 1 ? '' : `"${'\u200b'.repeat(this.length - 2)}"`;

        // finally generate a runnable script instance
        this.m_script = new vm.Script(this.dummy, { cachedData: this.m_buffer, ...options });
    }

    //  PUBLIC METHODS  //

    /** Coordinates launching the bytecode. */
    launch(options: vm.RunningScriptOptions = {}): T {
        // ensure the script is valid (eg: cached data is not invalidated)
        Assert(this.valid, 'Bytecode > Invalid or incompatible script data');

        // return the script in the current context
        return this.m_script.runInThisContext(options);
    }
}

/** Bytecode Versioning. */
export namespace Bytecode.Version {
    //  PROPERTIES  //

    /** The current underlying version to use. */
    export const CURRENT = parseInt(process.version.match(/^v(\d+)\.\d+/)?.[1] ?? '0');

    /** Carbon versioning list. */
    export const CARBON: string[] = ['v8.8', 'v8.9'];

    /** Long-term support versioning list. */
    export const LTS: string[] = CURRENT >= 12 ? new Array(CURRENT - 11).fill(0).map((ii) => `v${ii + 12}`) : [];
}

/** Bytecode Utilities. */
export namespace Bytecode.Utils {
    //  PROPERTIES  //

    /** Slice handler based on versioning (deprecation warnings can be ignored now). */
    const m_slicer = parseInt(process.versions.node, 10) >= 16 ? 'subarray' : 'slice';

    //  PUBLIC METHODS  //

    /**
     * Raw compilation step for bytecode generation.
     * @param code                                          Code to create.
     * @param isModule                                      Module flag.
     * @returns
     */
    export const compile = (code: string, isModule: boolean = false) => {
        // ensure the code is wrapped as a module if necessary
        code = isModule ? Module.wrap(code) : code;

        // generate the base code-script instance
        const script = new vm.Script(code, { produceCachedData: true });

        // generate the buffer to be used
        const buffer = script.createCachedData();

        // fix and return the resulting buffer value
        return m_fix(buffer), buffer;
    };

    /**
     * Determines an accurate length of a script buffer.
     * @param buffer                                        Buffer instance.
     */
    export const length = (buffer: Buffer) => {
        // determine the starting an ending positions
        const [s, e] = Version.CARBON.some((v) => process.version.startsWith(v)) ? [12, 16] : [8, 12];

        // and now determine the length of the buffer required
        return buffer[m_slicer](s, e).reduce((a, n, p) => (a += n * Math.pow(256, p)), 0);
    };

    //  PRIVATE METHODS  //

    /**
     * Helper method to ensure compiled scripts have accurate versioning.
     * @param buffer                                        Buffer instance.
     */
    const m_fix = (buffer: Buffer) => {
        // prepare the dummy instance for use
        const dummy = new vm.Script(`"TSB-${pkg.version}"`, { produceCachedData: true }).createCachedData();

        // modify the original buffer instance
        if (Version.CARBON.some((v) => process.version.startsWith(v))) {
            dummy[m_slicer](16, 20).copy(buffer, 16);
            dummy[m_slicer](20, 24).copy(buffer, 20);
        } else if (Version.LTS.some((v) => process.version.startsWith(v))) {
            dummy[m_slicer](12, 16).copy(buffer, 12);
        } else {
            dummy[m_slicer](12, 16).copy(buffer, 12);
            dummy[m_slicer](16, 20).copy(buffer, 16);
        }
    };
}
