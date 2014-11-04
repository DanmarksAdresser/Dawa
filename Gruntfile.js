module.exports = function (grunt) {
  "use strict";

  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    jshint: {
      all: [
        "*.js",
        "test/**/*.js"
      ],
      options: {
        jshintrc: true
      }
    },
    jasmine_node: {
      unit: {
        specFolders: ['test/unit'],
        includeStackTrace: true
      },
      integration: {
        specFolders: ['test/integration'],
        includeStackTrace: true,
        captureExceptions: true,
        junitreport: {
          report: true,
          savePath: 'build/reports/jasmine',
          useDotNotation: true
        }
      }
    },
    express: {
      test: {
        options: {
          script: 'server.js',
          args: ['--listenPort=3002', '--masterListenPort=3003'],
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
    },
    release: {
      options: {
        push: false, //default: true
        pushTags: false, //default: true
        npm: false, //default: true
        npmtag: false, //default: no tag
        tagName: 'v<%= version %>', //default: '<%= version %>'
        commitMessage: 'new Release <%= version %>', //default: 'release <%= version %>'
        tagMessage: 'tagging version <%= version %>', //default: 'Version <%= version %>',
      }
    },
    bower: {
      install: {
        options: {
          targetDir: 'public/lib',
          layout: 'byComponent'
        }
      }
    }
  });

  grunt.loadNpmTasks('grunt-release');
  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-express-server');
  grunt.loadNpmTasks('grunt-contrib-watch');

  grunt.loadNpmTasks('grunt-bower-task');

  grunt.registerTask('unitTest', ['jshint', 'jasmine_node:unit']);
  grunt.registerTask('integrationtest', ['express:test', 'jasmine_node:integration', 'express:test:stop']);
  grunt.registerTask('test', ['unitTest', 'integrationtest']);
  grunt.registerTask('default', ['bower','test']);

  grunt.registerMultiTask('jasmine_node', 'Run jasmine-node', function() {
    var jasmine = require('jasmine-node');
    var done = this.async();
    var options = this.data;
    var previousListeners = process.listeners('uncaughtException');
    var globalExceptions = [];
    options.onComplete = function(runner) {
      var exitCode;
      if (runner.results().failedCount === 0 && globalExceptions.length === 0) {
        exitCode = 0;
      } else {
        exitCode = 1;
        globalExceptions.forEach(function(exception) {
          console.log('Global exception: ');
          console.dir(exception);
          if(exception.stack) {
            console.log(exception.stack);
          }
        });
        process.exit(exitCode);
      }
      process.removeListener('uncaughtException', jasmineExceptionHandler);
      previousListeners.forEach(function(listener) {
        process.addListener('uncaughtException', listener);
      });
      done();
    };
    var jasmineExceptionHandler = function(e) {
      console.error(e.stack || e);
      globalExceptions.push(e);
    };
    process.removeAllListeners('uncaughtException');
    process.addListener('uncaughtException', jasmineExceptionHandler);
    jasmine.executeSpecsInFolder(options);
  });
};
