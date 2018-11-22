import commonjs from 'rollup-plugin-commonjs';
import resolve from 'rollup-plugin-node-resolve';
import scss from 'rollup-plugin-scss'
import inject from 'rollup-plugin-inject';

export default {
  entry: 'public/js/dawa.js',
  moduleName: 'dawa',
  plugins: [
    resolve(),
    commonjs(),
    inject({
      include: ['node_modules/jquery-ui-dist/**/*.js','public/js/bootstrap-*.js'],
      jQuery: 'jquery'
    }),
    scss({
      output: 'dist/css/dawa.css' })
  ],
  format: 'iife',
  dest: 'dist/js/dawa.js',
  watch: {
    include: ['public/scss/*']
  }

};
