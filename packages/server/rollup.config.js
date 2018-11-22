// rollup.config.js
import commonjs from 'rollup-plugin-commonjs';
import resolve from 'rollup-plugin-node-resolve';
import babel from 'rollup-plugin-babel';
import postcss from 'rollup-plugin-postcss'
import inject from 'rollup-plugin-inject';

export default {
  input: 'public/js/dawa.js',
  plugins: [
    resolve(),
    commonjs(),
    inject({
      include: ['../../node_modules/jquery-ui-dist/**/*.js','public/js/bootstrap-*.js'],
      jQuery: 'jquery'
    }),
    babel({
      "presets": [
        [
          "env",
          {
            "modules": false
          }
        ]
      ],
      ignore: ["*.css", "*.scss"],
      "plugins": ["external-helpers", "transform-object-rest-spread"]
    })
  ],
  output: [{
    name: 'dawa',
    format: 'iife',
    file: 'dist/js/dawa.js'
  }]
};
