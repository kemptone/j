"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
// var _arguments = arguments;

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

exports.splitPath = splitPath;
exports.jim = jim;
var f = new Function();

function splitPath(path) {

  path = path || "";

  if (path.indexOf("{") > -1) {
    path.match(/{(.*?)}/g).forEach(function (m) {
      var r = m.replace(/\./g, ",").replace(/[\s{}]/g, "");
      path = path.replace(m, r);
    });
  }

  path = String(path).replace(/\[/g, ".").replace(/\]/g, "").replace(/\//g, "_");

  return String(path).split(".");
}

/**
 * 
 * highly optimized version of j, that takes an array instead of string
 * 
 * @export
 * @param {any} [arr=[]] 
 * @param {any} [obj={}] 
 * @param {any} alternate 
 * @returns 
 */
function jim(arr, obj, alternate) {

  arr = arr || [];
  obj = obj || {};

  while (arr.length) {
    if (!(obj = obj[arr.shift()])) break;
  }return obj === undefined || obj === null ? alternate || obj : obj;
}

/**
 * a convenience tool for returning deeply nested properties in objects
 * @param path {string} "path.to.my.underworld"
 * @param obj {object | function} source object to check, if function, it must return an object like thing
 * @param alternate {*=} optional value to return if no value is found
 * @param up {*=} optional number, to return a parent within a long path
 * @param isFunction {boolean=} in case you want to dive into a function without calling it
 * @returns {*} value of the path inside object
 */
function _j(path, obj, alternate, up, isFunction, arr) {

  path = path || "";
  obj = obj || {};
  up = up || 0;

  if (typeof path === "undefined") return alternate;else if ((typeof path === "undefined" ? "undefined" : _typeof(path)) === "object") return jbound.apply(this, arguments);

  if (path === "") return obj;

  if (path.indexOf("*") > -1) return _jin.apply(this, arguments);

  // if object is a function, return the results of it being called
  if (!isFunction && typeof obj === "function") if (!(obj = obj())) // function must return an object like thing
    return alternate;

  if (!arr) arr = splitPath(path);

  while (arr.length - up) {
    if (!(obj = obj[arr.shift()])) break;
  }return typeof obj === "undefined" || obj === null ? alternate : obj;
}

/**
 * 
 * internal function for deciding inside jin loop
 * 
 * @param {string} key 
 * @param {number} index 
 * @param {any} item 
 * @param {array} all 
 * @param {array} cursor 
 */
exports.j = _j;
function jinTruthy(key, index, item, all, cursor, isGreaterLessor) {

  var isDeep = key.indexOf(",") > -1;

  var isNeg = key.indexOf("!") > -1,
      isGreater = key.indexOf(">") > -1,
      isLessor = key.indexOf("<") > -1,
      isAlsoEqualTo = key.indexOf(">=") > -1 || key.indexOf("<=") > -1,
      keySplit = key.split(/[>!<]?[=><]/),
      subKey = keySplit[0],
      subQuery = keySplit[1],
      isEqual = function () {

    if (isDeep) {
      var path = index + "." + subKey.replace(/,/g, ".");
      var value = _j(path, cursor || all);

      if (isGreater) return value === undefined ? false : isAlsoEqualTo ? value >= Number(subQuery) : value > Number(subQuery);

      if (isLessor) return value === undefined ? false : isAlsoEqualTo ? value <= Number(subQuery) : value < Number(subQuery);

      return subQuery ? value == subQuery : !!value;
    }

    subQuery = subQuery === "true" ? true : subQuery === "false" ? false : subQuery;

    return subQuery || subQuery === false ? item[subKey] == subQuery : !!item[subKey];
  }();

  if (isNeg && isEqual) {

    if (cursor) cursor[index] = undefined;

    all[index] = undefined;
  }

  if (!isNeg && !isEqual) {

    if (cursor) cursor[index] = undefined;

    all[index] = undefined;
  }

  return;
}

/***
 * This is a way of exploring or modifying deeply nested objects, with wildcards
 * 
 * lets say you had an object like this

   var dog = {
      stuff : {
        deeper : [
          {
            name : "John"
            , list : [
              { cause : "good", hope : true }
              , { cause : "good", hope : true }
              , { cause : "bad", hope : true }
              , { cause : "good", hope : false }
            ]
          }
          , {
            name : "Devin"
            , list : [
            { cause : "bad", hope : false }
            , { cause : "bad", hope : true }
            , { cause : "bad", hope : true }
            , { cause : "good", hope : false }
          ]
          }
        ]
      }
    }

    // Lets say you wanted all list items from both objects inside deeper

    let ret = (function(ret) {

      for (var x in dog.stuff.deeper)
        dog.stuff.deeper[ x ].list.forEach( i => ret.push( i )  )

      return ret

    }( [ ] ))

    with jin you could do this instead:

    let ret = j("stuff.deeper.*.list.*", dog)

    the benefit also is that it is null safe, if stuff.deeper[1] is empty, or has no list, then it will return an empty array


 * @param {string} path
 * @param {object || function} obj base object
 * @param {boolean=} isFunction only needed if exploring a function
 * @returns {*}
 */
function _jin(path, obj, alternate, up, isFunction, pathArr) {

  path = path || "";
  obj = obj || {};
  up = up || 0;

  // if object is a function, return the results of it being called
  if (!isFunction && typeof obj === "function") if (!(obj = obj())) // function must return an object like thing
    return [];

  if (!pathArr) pathArr = splitPath(path);

  var all = [obj];

  // apply the up
  pathArr.splice(pathArr.length - up, up);

  var key = void 0;
  var cursor = void 0;

  while (key = pathArr.shift()) {

    // breaks out of loop recursively
    // returns sourceObject as the total results which could allow for further filtering, 
    // or simply returning the first index of the whole set (while allowing for alternative)
    if (key.indexOf("^") > -1) return _j(pathArr.join("."), (cursor || all).filter(function (item) {
      return item !== undefined;
    }), alternate, up, isFunction);

    for (var x = 0, count = all.length; x < count; x++) {
      (function (item, index) {

        // when the array is null, then close this door off completely
        if (key === "*" && item === null) all[index] = undefined;

        if (item === undefined || item === null) return;

        if (key.indexOf("$") > -1) {
          cursor = [].concat(all);
          key = key.replace("$", "");
        }

        if (key.indexOf("&&") > -1) return key.split("&&").forEach(function (k) {
          return jinTruthy(k, index, item, all, cursor);
        });

        if (key.search(/[=><]/g) > -1) return jinTruthy(key, index, item, all, cursor);

        if (key === "*last") return all[index] = item[item.length - 1];

        if (key !== "*") {

          if (cursor) cursor[index] = item[key] ? cursor[index] : undefined;

          return all[index] = item[key]; // clears out index, or assigns it a value
        }

        all[index] = item instanceof Array ? item.forEach(function (i) {
          return all.push(i);
        }) : Object.keys(item).forEach(function (k) {
          return all.push(item[k]);
        });
      })(all[x], x);
    }
  }

  return (cursor || all).length ? (cursor || all).filter(function (item) {
    return item !== undefined;
  }) : alternate;
}

/**
 * Creates all of the j methods that are bound to a specific object, so you don't have to pass the obj
 * @param obj || function
 */
exports.jin = _jin;
var jbound = exports.jbound = function jbound(out, aliasForJ) {
  var ret = {
    j: function j(path, alternative, up, isFunction) {
      return _j(path, out, alternative, up, isFunction);
    },
    jin: function jin(path) {
      return _jin(path, out);
    },
    jack: function jack(path, callback, alternativeReturn, up) {
      return _jack(path, out, callback, alternativeReturn, up);
    },
    jmap: function jmap(path, keys, up) {
      return _jmap(path, out, keys, up);
    },
    jarr: function jarr(path, key, objReturn) {
      return _jarr(path, out, key, objReturn);
    },
    jfun: function jfun(path) {
      return _jfun(path, out);
    },
    jhandler: function jhandler(path) {
      for (var _len = arguments.length, args = Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
        args[_key - 1] = arguments[_key];
      }

      return _jhandler.apply(undefined, [path, out].concat(args));
    },
    jthunk: function jthunk(path) {
      return _jthunk(path, out);
    },
    jif: function jif(path, test) {
      return _jif(path, out, test);
    },
    incept: function incept(path, thing, replaceParent) {
      return _incept(path, out, thing, replaceParent);
    },
    inceptOnce: function inceptOnce(path, thing) {
      return _inceptOnce(path, out, thing);
    },
    inceptif: function inceptif(path, thing) {
      return _inceptif(path, out, thing);
    },
    jdelete: function jdelete(path, replaceParent, ret) {
      return _jdelete(path, out, replaceParent, ret);
    },
    wait: function wait(path, callback) {
      return _wait(path, out, callback);
    },
    juniqueByKey: function juniqueByKey(path, key) {
      return _juniqueByKey(path, out, key);
    },
    junescape: function junescape(path, alternate) {
      return _junescape(path, out, alternate);
    },
    jconcat: function jconcat() {
      return _jconcat.apply(out, [out].concat(Array.prototype.slice(arguments)));
    },
    jbound: jbound,
    out: out,
    uniqueByKey: uniqueByKey,
    loadScriptFile: loadScriptFile,
    getType: getType,
    mapArguments: mapArguments
  };

  if (aliasForJ) ret[aliasForJ] = ret.j;

  return ret;
};

/**
 * tests if the value of the path equals 'test'
 * @param path {string} typical j path "path.to.deep.property"
 * @param obj {object} source object for path
 * @param test {*} test candidate
 * @returns {boolean}
 */
function _jif(path, obj, test, up) {
  if (test instanceof Array) return jifany(path, obj, test, up);
  return test !== undefined && test === _j(path, obj, undefined, up);
}

exports.jif = _jif;
function jifany(path, obj) {
  var testArray = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : [];
  var up = arguments[3];

  var value = _j(path, obj, up);
  return testArray.some(function (val) {
    return val === value;
  });
}

/**
 * Takes a path or paths and executes a callback
 * @param path {(string|string[]|number)} typical j path "path.to.deeply.nested.thing"
 * @param obj {object|function} base object for path, or function that returns object
 * @param callback {function} executes on success
 * @param alternativeReturn {*?} optional thing to return if nothing found (only for none array paths)
 * @returns {*} the executed callback or alternativeReturn
 */
function _jack(path, obj, callback, alternativeReturn, up) {

  if (path === undefined || !obj) return;

  var thing = void 0,
      arr = void 0;

  if (path instanceof Array && (arr = path.map(function (item) {
    return _j(item, obj, undefined, up);
  }).filter(function (i) {
    return i !== undefined;
  })).length === path.length) return callback.apply(obj, arr);else if (!arr && (thing = _j(path, obj, undefined, up)) !== undefined) return callback(thing);else if (typeof alternativeReturn === "function") return alternativeReturn();else return alternativeReturn;
}

/**
 * Creates a new array based on a nested path within an object, based on an object like thing
 *
 * source:
 * // window.path.to.something
 * window.path.to.something = {
 *  part1 : { ... }
 *  , part2 : { ... }
 *  , part3 : { ... }
 *  , part4 : { ... }
 * }
 *
 * jmap( "path.to.something", window, ["part1", "part2", "part3"] )
 * returns:
 * [
 *  [ "part1", { ... }, 0 ]
 *  , [ "part2", { ... }, 0 ]
 *  , [ "part3", { ... }, 0 ]
 * ]
 *
 * @param path {string} typical j path "path.to.something"
 * @param obj {object} source object for path
 * @param keys {array=} returns in this order
 * @returns {Array}
 */
exports.jack = _jack;
function _jmap(path, obj, keys, up) {

  var arr = [];
  obj = _j(path, obj, {}, up);

  if (keys) keys.forEach(function (key, index) {
    arr.push([key, obj[key], index]);
  });else return Object.keys(obj).map(function (key, index) {
    return [key, obj[key], index];
  });

  return arr;
}

/**
 maps an array of objects into a single object by specified key.
 *
 * @param path {string} typical j path "something.is.overhere"
 * @param source {array} an array of objects
 * @param key {string} key within the object
 * @param obj {object=} optional object that gets modified by arr
 * @returns {*|{}}
 */
exports.jmap = _jmap;
function _jarr(path, source, key, obj, up) {
  obj = obj || {};
  _j(path, source, [], up).forEach(function (item) {
    return obj[item[key]] = item;
  });
  return obj;
}

/***
 * This is for building the crazy one liner functional goo
 * always returns a function if found, or a blank one if not found
 * @param path {(string|string[]|number)} typical j path "path.to.deeply.nested.thing"
 * @param obj {object} base object for path
 * @returns function
 */
exports.jarr = _jarr;
function _jfun(path, source) {
  var fun = _j(path, source, undefined);
  var parent = _j(path, source, undefined, 1);
  if (typeof fun === "function") return fun.bind(parent);else return new Function();
}

/***
 * This is for building the crazy one liner functional goo
 * always returns a function if found, or a blank one if not found
 * @param path {(string|string[]|number)} typical j path "path.to.deeply.nested.thing"
 * @param obj {object} base object for path
 * @returns function
 */
exports.jfun = _jfun;
function _jhandler(path, source) {
  for (var _len2 = arguments.length, args = Array(_len2 > 2 ? _len2 - 2 : 0), _key2 = 2; _key2 < _len2; _key2++) {
    args[_key2 - 2] = arguments[_key2];
  }

  return function () {
    var fun = _j(path, source, undefined);
    if (typeof fun === "function") return fun.apply(undefined, args);
  };
}

exports.jhandler = _jhandler;
function _jthunk(path, source) {
  var f = function f() {
    return f;
  };
  var fun = _j(path, source, undefined);
  var parent = _j(path, source, undefined, 1);
  if (typeof fun === "function") return fun.bind(parent);else return f;
}

/**
 * adds nested properties into an object based on a path, the inverse of j
 *
 * @param path {string} 'path.to.thing"
 * @param base {object} base thing to add to
 * @param thing {*} value to place at path
 * @returns thing {*} returns the thing being added
 */
exports.jthunk = _jthunk;
var _incept = function _incept() {
  var path = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : "";
  var base = arguments[1];
  var thing = arguments[2];
  var replaceParent = arguments[3];


  var arr = splitPath(path),
      obj = base || undefined,
      parent = obj,
      parentKey = void 0,
      x = 0,
      p = void 0;

  while (x < arr.length) {

    p = arr[x];

    if (x === arr.length - 1) {
      if (replaceParent && parentKey) {
        var ret = Object.assign({}, obj);
        ret[p] = thing;
        return parent[parentKey] = ret;
      } else {
        return obj[p] = thing;
      }
    } else if (obj[p] === undefined) {
      parent = obj;
      parentKey = p;
      obj = obj[p] = {};
    } else {
      parent = obj;
      parentKey = p;
      obj = obj[p];
    }
    x++;
  }

  return thing;
};

exports.incept = _incept;
var _inceptOnce = function _inceptOnce(path, base, thing, r) {
  if (r = _j(path, base)) return r;else return _incept(path, base, thing);
};

/***
 * Only incept a property if the parent already exists
 * @param path
 * @param base
 * @param thing
 * @returns {thing}
 */
exports.inceptOnce = _inceptOnce;
var _inceptif = function _inceptif(path, base, thing) {
  if (_j(path, base, undefined, 1)) return _incept(path, base, thing);
};

/**
 * deletes a nested property from a nested parent
 * @param path
 * @param base
 * @param ret - optional thing to return
 * @returns parent object
 */
var _jdelete = function _jdelete(path, base, replaceParent) {
  path = path || "";
  var split = splitPath(path).reverse(),
      finalKey = split[0],
      parentKey = split[1],
      parent = _j(path, base, {}, 1);

  delete parent[finalKey];

  if (replaceParent) {
    _j(path, base, {}, 2)[parentKey] = Object.assign({}, parent);
    return Object.assign({}, base);
  }

  return base;
};

/***
 * Polling function for checking if a nested property of a given base object has a value
 * Callback returns the value of the nested property
 * @param path
 * @param base
 * @param callback
 * @param attempts
 * @param timeout
 * @returns {*} nested property based on the path relative to the base object
 */
exports.jdelete = _jdelete;
var _wait = function _wait(path, base) {
  var callback = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : new Function();
  var failCallback = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : new Function();
  var attempts = arguments[4];
  var timeout = arguments[5];

  attempts = typeof attempts === "undefined" ? 30 : attempts;
  timeout = typeof timeout === "undefined" ? 100 : timeout;
  if (attempts > 0) return _jack(path, base, callback, function () {
    return setTimeout(function () {
      return _wait(path, base, callback, failCallback, attempts - 1);
    }, timeout);
  });else return failCallback();
};

/***
 *
 * Simple function to load a script file
 * @param src
 * returns wait function
 *
 * example of use:
 * loadScriptFile("/path/to/script.js")
 *
 * fancy example of use:
 * loadScriptFile("/path/to/script.js")("zxcvbn")
 */
exports.wait = _wait;
var loadScriptFile = exports.loadScriptFile = function loadScriptFile(src) {
  var id = splitPath(src).join("_").substr(1);

  if (document.getElementById(id)) return _wait;

  var script = document.createElement("script");
  script.type = "text/javascript";
  script.src = src;

  script.id = id;
  document.head.appendChild(script);
  return _wait;
};

var loadStyle = exports.loadStyle = function loadStyle(src) {
  var id = splitPath(src).join("_").substr(1);

  if (document.getElementById(id)) return _wait;

  var elm = document.createElement("link");
  elm.rel = "stylesheet";
  elm.href = src;
  elm.id = id;
  document.head.appendChild(elm);
};

function pushInObj(name, item, obj) {
  if (!obj[name]) obj[name] = [];
  obj[name].push(item);
}

var getType = exports.getType = function getType(thing) {
  return "_" + Object.prototype.toString.call(thing).slice(8, -1);
};

var mapArguments = exports.mapArguments = function mapArguments(args, map) {

  map = map || {};

  for (var y = 0; y < args.length; y++) {
    pushInObj(getType(args[y]), args[y], map);
  }return map;
};

/***
 * Client Side only {Action} to load a script file, and dispatch to redux when is done
 * @param src
 * @param path
 */
var loadScript = exports.loadScript = function loadScript(src, path) {
  return function (dispatch, getState) {

    // if it's already loaded, just ignore it
    if (_j("globals.externalLibraries." + path, getState)) return;

    dispatch({ type: "EXTERNAL_LIBRARY_LOADING", payload: path });
    loadScriptFile(src)(path, window, function () {
      return dispatch({ type: "EXTERNAL_LIBRARY_LOADED", payload: path });
    });
  };
};

/**
 * takes an object array and returns only unique items based on a key of the objects
 * last in overrides previous with same key, so you could push to the end of an array and have the old ones removed
 * @param arr
 * @param key
 * @param returnArr
 * @returns {Array} returnArr is supplied, or a new array if not
 */
var uniqueByKey = exports.uniqueByKey = function uniqueByKey(arr, key, returnArr) {

  arr = arr || [];
  key = key || "";
  returnArr = returnArr || [];

  var obj = {};

  arr.forEach(function (item) {

    if (!item) return;

    var i = obj[item[key]];

    if (i) return returnArr[i - 1] = item;

    // captures index, and adds to array
    obj[item[key]] = returnArr.push(item);
  });

  return returnArr;
};

var _jconcat = function _jconcat(base) {
  var path = Array.prototype.slice.call(arguments, 1),
      ret = [];
  path.forEach(function (path) {
    _j(path, base, []).forEach(function (item) {
      return ret.push(item);
    });
  });
  return ret;
};

/**
 * Takes a j path, and key, and applies uniqueByKey to key to returned item
 * @param path
 * @param source
 * @param key
 * @returns {Array}
 */
exports.jconcat = _jconcat;
var _juniqueByKey = function _juniqueByKey(path, source, key) {
  return uniqueByKey(_j(path, source), key);
};

exports.juniqueByKey = _juniqueByKey;
var _junescape = function _junescape(path, base, alternative) {

  var text = _j(path, base, alternative || "");

  if (typeof text !== "string") return text;

  return text.replace(/&amp;/g, String.fromCharCode(38)) // &
  .replace(/&lt;/g, String.fromCharCode(60)) // <
  .replace(/&gt;/g, String.fromCharCode(62)) // >
  .replace(/(&quot;|&#8220;|&#8221;)/g, String.fromCharCode(34)) // "
  .replace(/(&#x27;|&#8216;|&#8217;)/g, String.fromCharCode(39)) // '
  .replace(/&#96;/g, String.fromCharCode(96)); // `
};

exports.junescape = _junescape;
exports.default = _j;

