module.exports = function (grunt) {
  "use strict";

  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    jshint: {
      all: [
        "Gruntfile.js", "dawaApi.js", "postnummerCrud.js", "test/**/*.js"
      ],
      options: {
        jshintrc: true
      }
    },
    jasmine_node: {
      unit: {
        specFolders: ['test/unit']
      },
      integration: {
        specFolders: ['test/integration']
      }
    }
  });

  grunt.loadNpmTasks('grunt-contrib-jshint');

  grunt.registerTask('test', ['jshint', 'jasmine_node:unit']);
  grunt.registerTask('integrationtest', ['jasmine_node:integration']);
  grunt.registerTask('default', ['test']);

  grunt.registerMultiTask('jasmine_node', 'Run jasmine-node', function() {
    var jasmine = require('jasmine-node');
    var done = this.async();
    var options = this.data;
    options.onComplete = function(runner) {
      var exitCode;
      if (runner.results().failedCount === 0) {
        exitCode = 0;
      } else {
        exitCode = 1;

        process.exit(exitCode);
      }

      done();
    };

    jasmine.executeSpecsInFolder(options);
  });
};