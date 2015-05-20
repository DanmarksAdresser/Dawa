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
    mochaTest: {
      unit: {
        src: ['test/setupLogging.js', 'test/unit/**/*Spec.js']
      },
      integration: {
        src: ['test/setupLogging.js', 'test/integration/**/*Spec.js']
      },
      options: {
        timeout: 10000,
        bail: true
      }
    },
    express: {
      test: {
        options: {
          script: 'server.js',
          args: ['--listenPort=3002', '--masterListenPort=3003', '--logConfiguration=travis-ci-server-logconfig.json'],
          output: 'Express server listening'
        }
      }
    },
    watch: {
      test: {
        files:  [ 'test/**/*.js', '*.js', 'public/**/*' ],
        tasks:  [ 'test' ]
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
        tagMessage: 'Release af version <%= version %>', //default: 'Version <%= version %>',
        additionalFiles: ['bower.json']
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
  grunt.loadNpmTasks('grunt-mocha-test');
  grunt.loadNpmTasks('grunt-bower-task');

  grunt.registerTask('unitTest', ['jshint', 'mochaTest:unit']);
  grunt.registerTask('integrationtest', ['express:test', 'mochaTest:integration', 'express:test:stop']);
  grunt.registerTask('test', ['unitTest', 'integrationtest']);
  grunt.registerTask('default', ['bower','test']);
};
