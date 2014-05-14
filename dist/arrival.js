;(function(){

/**
 * Require the given path.
 *
 * @param {String} path
 * @return {Object} exports
 * @api public
 */

function require(path, parent, orig) {
  var resolved = require.resolve(path);

  // lookup failed
  if (null == resolved) {
    orig = orig || path;
    parent = parent || 'root';
    var err = new Error('Failed to require "' + orig + '" from "' + parent + '"');
    err.path = orig;
    err.parent = parent;
    err.require = true;
    throw err;
  }

  var module = require.modules[resolved];

  // perform real require()
  // by invoking the module's
  // registered function
  if (!module._resolving && !module.exports) {
    var mod = {};
    mod.exports = {};
    mod.client = mod.component = true;
    module._resolving = true;
    module.call(this, mod.exports, require.relative(resolved), mod);
    delete module._resolving;
    module.exports = mod.exports;
  }

  return module.exports;
}

/**
 * Registered modules.
 */

require.modules = {};

/**
 * Registered aliases.
 */

require.aliases = {};

/**
 * Resolve `path`.
 *
 * Lookup:
 *
 *   - PATH/index.js
 *   - PATH.js
 *   - PATH
 *
 * @param {String} path
 * @return {String} path or null
 * @api private
 */

require.resolve = function(path) {
  if (path.charAt(0) === '/') path = path.slice(1);

  var paths = [
    path,
    path + '.js',
    path + '.json',
    path + '/index.js',
    path + '/index.json'
  ];

  for (var i = 0; i < paths.length; i++) {
    var path = paths[i];
    if (require.modules.hasOwnProperty(path)) return path;
    if (require.aliases.hasOwnProperty(path)) return require.aliases[path];
  }
};

/**
 * Normalize `path` relative to the current path.
 *
 * @param {String} curr
 * @param {String} path
 * @return {String}
 * @api private
 */

require.normalize = function(curr, path) {
  var segs = [];

  if ('.' != path.charAt(0)) return path;

  curr = curr.split('/');
  path = path.split('/');

  for (var i = 0; i < path.length; ++i) {
    if ('..' == path[i]) {
      curr.pop();
    } else if ('.' != path[i] && '' != path[i]) {
      segs.push(path[i]);
    }
  }

  return curr.concat(segs).join('/');
};

/**
 * Register module at `path` with callback `definition`.
 *
 * @param {String} path
 * @param {Function} definition
 * @api private
 */

require.register = function(path, definition) {
  require.modules[path] = definition;
};

/**
 * Alias a module definition.
 *
 * @param {String} from
 * @param {String} to
 * @api private
 */

require.alias = function(from, to) {
  if (!require.modules.hasOwnProperty(from)) {
    throw new Error('Failed to alias "' + from + '", it does not exist');
  }
  require.aliases[to] = from;
};

/**
 * Return a require function relative to the `parent` path.
 *
 * @param {String} parent
 * @return {Function}
 * @api private
 */

require.relative = function(parent) {
  var p = require.normalize(parent, '..');

  /**
   * lastIndexOf helper.
   */

  function lastIndexOf(arr, obj) {
    var i = arr.length;
    while (i--) {
      if (arr[i] === obj) return i;
    }
    return -1;
  }

  /**
   * The relative require() itself.
   */

  function localRequire(path) {
    var resolved = localRequire.resolve(path);
    return require(resolved, parent, path);
  }

  /**
   * Resolve relative to the parent.
   */

  localRequire.resolve = function(path) {
    var c = path.charAt(0);
    if ('/' == c) return path.slice(1);
    if ('.' == c) return require.normalize(p, path);

    // resolve deps by returning
    // the dep in the nearest "deps"
    // directory
    var segs = parent.split('/');
    var i = lastIndexOf(segs, 'deps') + 1;
    if (!i) i = 0;
    path = segs.slice(0, i + 1).join('/') + '/deps/' + path;
    return path;
  };

  /**
   * Check if module is defined at `path`.
   */

  localRequire.exists = function(path) {
    return require.modules.hasOwnProperty(localRequire.resolve(path));
  };

  return localRequire;
};
require.register("arrival/arrival.js", function(exports, require, module){
/**
 * Utilities
 */

var style = getComputedStyle;
var slice = [].slice;


/**
 * Return a floating point number from a string
 */

function ms(str) {
  return parseFloat(str) * 1000;
}


/**
 * Take a node and return it's computed transition 
 * 'duration' and 'delay' style values
 * 
 * @param  {Element} node
 * @return {Number} 
 */

function getDuration(node) {
  var duration = ms(style(node).transitionDuration);
  var delay = ms(style(node).transitionDelay);
  return duration + delay;
}


/**
 * Return an element with the longest transition duration
 * 
 * @param  {Element} el
 * @param  {String} child
 * @return {Element} longest
 */

function getTotalDuration(el, child) {
  child = child || null;
  var longest;
  var duration = 0;

  walk(el, child, function(node, next){
    var total = getDuration(node);

    if(total > duration) {
      longest = node;
      duration = total;
    }
    next();
  });

  return longest;
}


/**
 * Walk the all or selected children of an element
 * 
 * @param  {Element}  el
 * @param  {String}  child  [optional]
 * @param  {Function}  process
 * @param  {Function}  done
 * @return {Function}
 */

function walk(el, child, process, done) {
  done = done || function(){};
  var nodes = [];

  if(child){
    var children = el.querySelectorAll(child);
    Array.prototype.forEach.call(children, function(child){
      nodes.push(child);
    });
  }
  else {
    nodes = slice.call(el.children);
  }

  function next(){
    if(nodes.length === 0) return done();
    walk(nodes.shift(), null, process, next);
  }

  process(el, next);
}


/**
 * Expose 'Arrival'
 * Define a target to add an event listener to.
 * 
 * @param  {Element}  el
 * @param  {Function}  callback
 * @param  {String}  child
 */

module.exports = function(el, callback, child) {

  // if jQuery object, get the first child
  if (window.jQuery && el instanceof jQuery) el = el[0];

  var target = getTotalDuration(el, child);
  if(!target) return callback();

  target.addEventListener('transitionend', function end(){
    callback();
    target.removeEventListener('transitionend', end);
  });
};
});
require.register("arrival/index.js", function(exports, require, module){
var arrival = require('./arrival');
var test = document.querySelector('.tests');
var result = document.querySelector('.result');

function onComplete() {
  console.log("complete!");
  result.innerHTML = "Complete";
};

var triggerAll = document.querySelector('.all');
triggerAll.addEventListener('click', function(e){
  e.preventDefault();
  result.innerHTML = "";
  arrival(test, onComplete);
  test.classList.toggle('tests-start');
});

var triggerDecendantsOnly = document.querySelector('.descendants');
triggerDecendantsOnly.addEventListener('click', function(e){
  e.preventDefault();
  result.innerHTML = "";
  arrival(test, onComplete, '.descendant');
  test.classList.toggle('tests-start');
});
});
require.alias("arrival/index.js", "arrival/index.js");if (typeof exports == "object") {
  module.exports = require("arrival");
} else if (typeof define == "function" && define.amd) {
  define([], function(){ return require("arrival"); });
} else {
  this["arrival"] = require("arrival");
}})();