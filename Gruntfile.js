module.exports = function (grunt) {
  "use strict";

  require('load-grunt-tasks')(grunt);

  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    eslint: {
      target: '.'
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
          args: ['--listenPort=3002', '--masterListenPort=3003', '--ois.enabled=1', '--ois.unprotected=1', '--logConfiguration=travis-ci-server-logconfig.json'],
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
        tagMessage: 'Release af version <%= version %>' //default: 'Version <%= version %>',
      }
    }
  });

  grunt.registerTask('unitTest', ['eslint', 'mochaTest:unit']);
  grunt.registerTask('integrationtest', ['express:test', 'mochaTest:integration', 'express:test:stop']);
  grunt.registerTask('test', ['unitTest', 'integrationtest']);
  grunt.registerTask('default', ['test']);
};
