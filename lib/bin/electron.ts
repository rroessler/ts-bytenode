/// TSB Modules
import { TSC } from '..';

//  TYPEDEFS  //

/** Incoming Arguments Interface. */
interface IArguments {
    source: string | TSC.Program.IConfig;
    options: TSC.IOptions<string>;
}

//  PROPERTIES  //

// attempt parsing the incoming arguments
const args: IArguments = JSON.parse(process.argv.at(-1) as string);

// and destructure the desired parts necessary
const source = args.source;
const { pipeline: pl, ...options } = args.options;

// attempt generating a pipeline
const pipeline = typeof pl === 'string' ? require(pl).default : undefined;

//  RUNNER  //

// prepare the cache to be used
const cache = TSC.project(source, { pipeline, ...options });

// convert the cache into a serializable object
process.stdout.write(JSON.stringify(Array.from(cache.entries())));
