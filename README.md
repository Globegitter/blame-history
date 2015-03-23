# blame-history
A tool that analyses the commit history for a file and builds a history for every line in that file.

## Setup

Make sure you have the latest [io.js](https://iojs.org/en/index.html) installed (which includes [npm](https://www.npmjs.com/)). Then clone the project, run `npm install` in the root directory, followed by `npm test` to run the code.

To test with another file, or another repository you can run `npm test -- --path /other/path/ --file test.js`.

Or simply do `node run.js [--file <filename> --path <repositoryPath>]`.
