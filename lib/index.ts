/// Ensuring V8 is happy.
import v8 from 'v8';

v8.setFlagsFromString('--no-lazy');
if (Number.parseInt(process.versions.node, 10) >= 12) v8.setFlagsFromString('--no-flush-bytecode');

/// Re-exports.
export * as TSB from './augment';
export * from './codify';
export * from './compile';
export * from './options';
