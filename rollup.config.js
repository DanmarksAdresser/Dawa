// rollup.config.js
import commonjs from 'rollup-plugin-commonjs';
import resolve from 'rollup-plugin-node-resolve';
import babel from 'rollup-plugin-babel';
import css from 'rollup-plugin-css-only';
import inject from 'rollup-plugin-inject';

export default {
  entry: 'public/js/dawa.js',
  moduleName: 'dawa',
  plugins: [
    resolve(),
    commonjs(),
    inject({
      include: 'node_modules/jquery-ui-dist/**/*.js',
      jQuery: 'jquery'
    }),
    css({ output: 'dist/css/dawa.css' }),
    babel({
      "presets": [
        "es2015-rollup"
      ]
    })
  ],
  format: 'iife',
  dest: 'dist/js/dawa.js'
};
