# TS-Bytenode

A modified bytenode compiler for TypeScript projects using NodeJS.

Inspired by the original [`bytenode`](https://github.com/bytenode/bytenode) library, this tool instead compiles TypeScript code into `V8` bytecode. It is expected to be used with NodeJS (eg: CommonJS modules), and also allows compilation for Electron processes.

## Inspiration

The inspiration for this offshoot of `bytenode` came about from needing to reimplement a segmented build strategy for enterprise-level Electron applications. Since I needed separate production and development builds (as `bytenode` breaks debugging capabilities), any segmented system required extra build-tools and time to work with. 

Now by integrating both the exposed TypeScript compilation API and piping this output to a modified `bytenode` implementation, the outputs can be modified with ease.

## Install

```bash
npm install --save-dev ts-bytenode  # locally
npm install -g ts-bytnode           # globally
```

## Similarities and Differences to `bytenode`

* The underlying bytecode compilation and `require` augmentation remain the same, however custom file resolution can also be added to alter the desired extension and files that may be required.

* Ultimately the current issues affecting `bytenode` also affect `ts-bytenode`. Since the compilation stage is the same, the output bytecode is at the whim of the V8 engine. For more information please see the (issues for `bytenode`)[https://github.com/bytenode/bytenode#known-issues-and-limitations].

* One issue has been fixed unexpectedly by adding the TypeScript compilation stage. Since TypeScript polyfills Async/Await expressions, this results in Async Arrow Functions (and regular arrow functions) to not cause crashes in Puppeteer and Electron apps. This should be taken with a grain of salt as by setting `target = "ES2017"` or elsewise in your `tsconfig.json`, this will preserve Async/Await statements, thus reintroducing this issue.

* TS-Bytenode typically expects any `tsconfig.json` projects to use the `module = "CommonJS"` and `moduleResolution = "node"`. Since this package relies on the use of the NodeJS standard library, expecting other contexts is redundant.

## Command-Line Interface

```text
Usage: tsb [options] [command]

Options:
    -v, --version                       Output the package version.
    -h, --help                          Display help information.

Commands:
    run <filename>                      Launches a given bytecode file.
    compile [options] [filename]        Attempts compiling a given TS project to V8 bytecode.
    help [command]                      Display help for an optional command.

Examples:

$ tsb compile                           Compiles "tsconfig.json" found in the cwd.
$ tsb compile ./example                 Compiles the "tsconfig.json" found in the "./example" directory.
$ tsb compile ./example/tsconfig.json
$ tsb compile -m dev                    Output ".js" files instead of ".tsb".
$ tsb compile -m dev -d dev             Output resulting development files into "$outDir/dev". Modifies the "tsconfig.js" output directory.
$ tsb compile -i hello.ts __*           Ignore files by basename pattern matching.

$ tsb run ./example                     Launches the compiled "tsb" file "./example/dist/index.tsb" (if no "index.js" file exist).
$ tsb run ./example/index.tsb

```

## API

Alongside the CLI functionality, TS-Bytenode also exposes the internal compilation functionality. These can be accessed as.

```typescript
import { TSB, TSC, Bytecode} from 'ts-bytenode';

TSB; // Process augmentor method.
TSC; // TypeScript project compilation.
Bytecode; // Underlying bytecode compilation.
```

Of this functionality, the most important is the `require` modification.

> **`require<T extends any>(fileName: string): T`**

Just like `bytenode`, any `.tsb` modules can now be required after calling the `TSB.augment()` method. All compiled outputs are wrapped as modules by default as this is the expected functionality required.

Also to note, any compiled `.tsb` files must be executed from the same NodeJS version they were compiled with. This process is the same as `bytenode` so any issues pertaining to running compiled outputs will be the similar to their results.

## Acknowledgements

Much of this project could not be completed without taking inspiration from `bytenode` by @OsamaAbbas.

## License

[MIT](https://opensource.org/licenses/MIT)
