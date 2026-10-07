import {build} from 'esbuild';
await build({entryPoints:['src/checks-worker.js'],bundle:true,outfile:'dist/checks-worker.js',format:'iife',platform:'browser',target:['es2022'],minify:true,define:{'process.env':'{}'},legalComments:'linked',external:['fs','path']});
