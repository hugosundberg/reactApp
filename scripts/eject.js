/**
 * Copyright (c) 2015-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 */

var createJestConfig = require('./utils/createJestConfig');
var fs = require('fs');
var path = require('path');
var prompt = require('./utils/prompt');
var rimrafSync = require('rimraf').sync;
var spawnSync = require('cross-spawn').sync;

prompt(
  'Are you sure you want to eject? This action is permanent.',
  false
).then(shouldEject => {
  if (!shouldEject) {
    console.log('Close one! Eject aborted.');
    process.exit(1);
  }

  console.log('Ejecting...');
  console.log();

  var ownPath = path.join(__dirname, '..');
  var appPath = path.join(ownPath, '..', '..');
  var files = [
    path.join('config', 'babel.dev.js'),
    path.join('config', 'babel.prod.js'),
    path.join('config', 'flow', 'css.js.flow'),
    path.join('config', 'flow', 'file.js.flow'),
    path.join('config', 'eslint.js'),
    path.join('config', 'paths.js'),
    path.join('config', 'env.js'),
    path.join('config', 'polyfills.js'),
    path.join('config', 'typescript.dev.js'),
    path.join('config', 'typescript.prod.js'),
    path.join('config', 'webpack.config.dev.js'),
    path.join('config', 'webpack.config.prod.js'),
    path.join('config', 'jest', 'CSSStub.js'),
    path.join('config', 'jest', 'FileStub.js'),
    path.join('config', 'jest', 'environment.js'),
    path.join('config', 'jest', 'transform.js'),
    path.join('scripts', 'build.js'),
    path.join('scripts', 'start.js'),
    path.join('scripts', 'utils', 'chrome.applescript'),
    path.join('scripts', 'utils', 'prompt.js'),
    path.join('scripts', 'utils', 'WatchMissingNodeModulesPlugin.js')
  ];

  // Ensure that the app folder is clean and we won't override any files
  files.forEach(function(file) {
    if (fs.existsSync(path.join(appPath, file))) {
      console.error(
        '`' + file + '` already exists in your app folder. We cannot ' +
        'continue as you would lose all the changes in that file or directory. ' +
        'Please delete it (maybe make a copy for backup) and run this ' +
        'command again.'
      );
      process.exit(1);
    }
  });

  // Copy the files over
  fs.mkdirSync(path.join(appPath, 'config'));
  fs.mkdirSync(path.join(appPath, 'config', 'flow'));
  fs.mkdirSync(path.join(appPath, 'config', 'jest'));
  fs.mkdirSync(path.join(appPath, 'scripts'));
  fs.mkdirSync(path.join(appPath, 'scripts', 'utils'));

  files.forEach(function(file) {
    console.log('Copying ' + file + ' to ' + appPath);
    var content = fs
      .readFileSync(path.join(ownPath, file), 'utf8')
      // Remove license header from JS
      .replace(/^\/\*\*(\*(?!\/)|[^*])*\*\//, '')
      // Remove license header from AppleScript
      .replace(/^--.*\n/gm, '')
      .trim() + '\n';
    fs.writeFileSync(path.join(appPath, file), content);
  });
  console.log();

  var ownPackage = require(path.join(ownPath, 'package.json'));
  var appPackage = require(path.join(appPath, 'package.json'));

  console.log('Removing dependency: react-scripts');
  delete appPackage.devDependencies['react-scripts'];

  Object.keys(ownPackage.dependencies).forEach(function (key) {
    // For some reason optionalDependencies end up in dependencies after install
    if (ownPackage.optionalDependencies[key]) {
      return;
    }
    console.log('Adding dependency: ' + key);
    appPackage.devDependencies[key] = ownPackage.dependencies[key];
  });

  console.log('Updating scripts');
  Object.keys(appPackage.scripts).forEach(function (key) {
    appPackage.scripts[key] = 'node ./scripts/' + key + '.js'
  });
  delete appPackage.scripts['eject'];

  appPackage.scripts.test = 'jest';
  appPackage.jest = createJestConfig(
    filePath => path.join('<rootDir>', filePath)
  );

  // explicitly specify ESLint config path for editor plugins
  appPackage.eslintConfig = {
    extends: './config/eslint.js',
  };

  console.log('Writing package.json');
  fs.writeFileSync(
    path.join(appPath, 'package.json'),
    JSON.stringify(appPackage, null, 2)
  );
  console.log();

  console.log('Running npm install...');
  rimrafSync(ownPath);
  spawnSync('npm', ['install'], {stdio: 'inherit'});
  console.log('Ejected successfully!');
  console.log();

  console.log('Please consider sharing why you ejected in this survey:');
  console.log('  http://goo.gl/forms/Bi6CZjk1EqsdelXk1');
  console.log();
});
