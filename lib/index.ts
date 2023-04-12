/// Node Modules
import V8 from 'v8';

// Ensuring V8 loads happily
V8.setFlagsFromString('--no-lazy');

// also need to add some additional detail
if (Number.parseInt(process.versions.node, 10) >= 12) V8.setFlagsFromString('--no-flush-bytecode');

/// TSB Exports
export * as TSB from './_exports';
export * as TSC from './typescript';
