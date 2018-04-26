// rollup.config.js
import commonjs from 'rollup-plugin-commonjs';
import resolve from 'rollup-plugin-node-resolve';
import babel from 'rollup-plugin-babel';
import collectSass from 'rollup-plugin-collect-sass';
import css from 'rollup-plugin-css-only';
import scss from 'rollup-plugin-scss'
import inject from 'rollup-plugin-inject';

export default {
  input: 'public/js/dawa.js',
  plugins: [
    resolve(),
    commonjs(),
    inject({
      include: ['node_modules/jquery-ui-dist/**/*.js','public/js/bootstrap-*.js'],
      jQuery: 'jquery'
    }),
    scss({
      output: 'dist/css/dawa.css' }),
    babel({
      "presets": [
        "es2015-rollup"
      ],
      "plugins": ["transform-object-rest-spread"]
    })
  ],
  output: [{
    name: 'dawa',
    format: 'iife',
    file: 'dist/js/dawa.js'
  }]
};
