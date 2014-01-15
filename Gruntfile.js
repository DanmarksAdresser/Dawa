module.exports = function (grunt) {
  "use strict";

  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    jshint: {
      all: [
        "Gruntfile.js", "dawaApi.js", "dawaPGApi.js", "postnummerCrud.js", "test/**/*.js"
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
    },
    express: {
      test: {
        options: {
          script: 'server.js',
          output: 'Express server listening'
        }
      }
    },
    watch: {
      test: {
        files:  [ 'test/**/*.js', '*.js', 'public/**/*' ],
        tasks:  [ 'test' ]
//        options: {
//          spawn: false // Without this option specified express won't be reloaded
//        }
      }
    }
  });

  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-express-server');
  grunt.loadNpmTasks('grunt-contrib-watch');

  grunt.registerTask('unitTest', ['jshint', 'jasmine_node:unit']);
  grunt.registerTask('integrationtest', ['express:test', 'jasmine_node:integration', 'express:test:stop']);
  grunt.registerTask('test', ['unitTest', 'integrationtest']);
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
