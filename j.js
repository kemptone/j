let f = new Function()

export function splitPath (path) {

  path = path || ""

  if (path.indexOf("{") > -1) {
    path.match(/{(.*?)}/g).forEach( m => {
      let r = m.replace(/\./g, ",").replace(/[\s{}]/g, "")
      path = path.replace(m, r)
    })
  }

  path = String(path)
          .replace(/\[/g, ".")
          .replace(/\]/g, "")
          .replace(/\//g, "_")

  return String(path).split(".")
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
export function jim (arr, obj, alternate) {

  arr = arr || []
  obj = obj || {}

  while (arr.length)
    if (!(obj = obj[arr.shift()]))
      break

  return (obj === undefined || obj === null) ?
    alternate || obj : obj

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
export function j ( path, obj, alternate, up, isFunction, arr ) {

  path = path || ""
  obj  = obj || {}
  up = up || 0

  if (typeof path === "undefined")
    return alternate

  else if (typeof path === "object")
    return jbound.apply(this, arguments)

  if (path === "")
    return obj

  if (path.indexOf("*") > -1)
    return jin.apply(this, arguments)

  // if object is a function, return the results of it being called
  if (!isFunction && typeof obj === "function")
    if (!(obj = obj())) // function must return an object like thing
      return alternate

  if (!arr)
    arr = splitPath(path)

  while (arr.length - up)
    if (!(obj = obj[ arr.shift() ]))
      break

  return (typeof obj === "undefined" || obj === null) ?
    alternate : obj

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
function jinTruthy (key, index, item, all, cursor, isGreaterLessor) {

  let isDeep = key.indexOf(",") > -1

  let isNeg = key.indexOf("!") > -1
    , isGreater = key.indexOf(">") > -1
    , isLessor = key.indexOf("<") > -1
    , isAlsoEqualTo = key.indexOf(">=") > -1 || key.indexOf("<=") > -1
    , keySplit = key.split(/[>!<]?[=><]/)
    , subKey = keySplit[0]
    , subQuery = keySplit[1]
    , isEqual = (function() {

      if (isDeep) {
        let path = `${ index }.` + subKey.replace(/,/g, ".")
        let value = j(path, cursor || all)

        if (isGreater)
          return value === undefined ? false : isAlsoEqualTo ? value >= Number(subQuery) : value > Number(subQuery)

        if (isLessor)
          return value === undefined ? false : isAlsoEqualTo ? value <= Number(subQuery) : value < Number(subQuery)

        return subQuery ? value == subQuery : !!value
      }

      subQuery = subQuery === "true" ? true : subQuery === "false" ? false : subQuery

      return (subQuery || subQuery === false) ? item[subKey] == subQuery : !!item[subKey]

    }())

  if (isNeg && isEqual) {

    if (cursor)
      cursor[index] = undefined

    all[index] = undefined
  }

  if (!isNeg && !isEqual) {

    if (cursor)
      cursor[index] = undefined

    all[index] = undefined
  }

  return

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
export function jin ( path, obj, alternate, up, isFunction, pathArr ) {

  path = path || ""
  obj = obj || {}
  up = up || 0

  // if object is a function, return the results of it being called
  if (!isFunction && typeof obj === "function")
    if (!(obj = obj())) // function must return an object like thing
      return []

  if (!pathArr)
    pathArr = splitPath(path)

  const all = [ obj ]

  // apply the up
  pathArr.splice(pathArr.length - up, up)

  let key
  let cursor

  while (key = pathArr.shift()) {

    // breaks out of loop recursively
    // returns sourceObject as the total results which could allow for further filtering, 
    // or simply returning the first index of the whole set (while allowing for alternative)
    if (key.indexOf("^") > -1)
      return j(pathArr.join("."), (cursor || all).filter(item => item !== undefined), alternate, up, isFunction)

    for (let x = 0, count = all.length; x < count; x++)
      (function (item, index) {

        // when the array is null, then close this door off completely
        if (key === "*" && item === null)
          all[index] = undefined

        if (item === undefined || item === null)
          return

        if (key.indexOf("$") > -1) {
          cursor = [].concat(all)
          key = key.replace("$", "")
        }

        if (key.indexOf("&&") > -1)
          return key.split("&&").forEach( k => jinTruthy(k, index, item, all, cursor) )

        if (key.search(/[=><]/g) > -1)
          return jinTruthy(key, index, item, all, cursor)

        if (key === "*last")
          return all[index] = item[item.length - 1]

        if (key !== "*") {

          if (cursor)
            cursor[index] = item[key] ? cursor[index] : undefined

          return all[index] = item[key] // clears out index, or assigns it a value
        }

        all[index] = item instanceof Array ?
          item.forEach(i => all.push(i))
          : Object.keys(item).forEach(k => all.push(item[k]))

      }(all[x], x))
  }

  return (cursor || all).length ? (cursor || all).filter(item => item !== undefined) : alternate

}

/**
 * Creates all of the j methods that are bound to a specific object, so you don't have to pass the obj
 * @param obj || function
 */
export const jbound = (out, aliasForJ) => {
  const ret = {
    j (path, alternative, up, isFunction) { return j(path, out, alternative, up, isFunction) }
    , jin : path => jin(path, out)
    , jack (path, callback, alternativeReturn, up) { return jack(path, out, callback, alternativeReturn, up) }
    , jmap (path, keys, up) { return jmap(path, out, keys, up) }
    , jarr (path, key, objReturn) { return jarr(path, out, key, objReturn) }
    , jfun (path) { return jfun(path, out) }
    , jhandler (path, ...args) { return jhandler(path, out, ...args) }
    , jthunk (path) { return jthunk (path, out) }
    , jif (path, test) { return jif (path, out, test) }
    , incept (path, thing, replaceParent) { return incept(path, out, thing, replaceParent) }
    , inceptOnce (path, thing) { return inceptOnce(path, out, thing) }
    , inceptif (path, thing) { return inceptif(path, out, thing) }
    , jdelete (path, replaceParent, ret) { return jdelete(path, out, replaceParent, ret) }
    , wait (path, callback) { return wait(path, out, callback) }
    , juniqueByKey (path, key) { return juniqueByKey(path, out, key) }
    , junescape (path, alternate) { return junescape(path, out, alternate) }
    , jconcat () { return jconcat.apply(out, [ out ].concat( Array.prototype.slice(arguments) )) }
    , jbound
    , out
    , uniqueByKey
    , loadScriptFile
    , getType
    , mapArguments
  }

  if (aliasForJ)
    ret[aliasForJ] = ret.j

  return ret
}

/**
 * tests if the value of the path equals 'test'
 * @param path {string} typical j path "path.to.deep.property"
 * @param obj {object} source object for path
 * @param test {*} test candidate
 * @returns {boolean}
 */
export function jif ( path, obj, test, up ) {
  if (test instanceof Array)
    return jifany(path, obj, test, up)
  return test !== undefined && test === j(path, obj, undefined, up)
}

function jifany ( path, obj, testArray=[], up ) {
  const value = j(path, obj, up)
  return testArray.some(val => val === value)
}

/**
 * Takes a path or paths and executes a callback
 * @param path {(string|string[]|number)} typical j path "path.to.deeply.nested.thing"
 * @param obj {object|function} base object for path, or function that returns object
 * @param callback {function} executes on success
 * @param alternativeReturn {*?} optional thing to return if nothing found (only for none array paths)
 * @returns {*} the executed callback or alternativeReturn
 */
export function jack ( path, obj, callback, alternativeReturn, up ) {

  if (path === undefined || !obj)
    return

  let thing, arr

  if ( path instanceof Array && ( arr = path.map(item => j(item, obj, undefined, up)).filter(i => i !== undefined)  ).length === path.length )
    return callback.apply(obj, arr)

  else if (!arr && (thing = j(path, obj, undefined, up)) !== undefined)
    return callback(thing)

  else
    if (typeof alternativeReturn === "function")
      return alternativeReturn()
    else
      return alternativeReturn

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
export function jmap ( path, obj, keys, up ) {

  const arr = []
  obj = j(path, obj, {}, up)

  if (keys)
    keys.forEach( (key, index) => {
      arr.push( [ key, obj[key], index ] )
    })
  else
    return Object.keys(obj).map( (key, index) => {
      return [ key, obj[key], index ]
    })

  return arr
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
export function jarr ( path, source, key, obj, up ) {
  obj = obj || {}
  j(path, source, [], up)
    .forEach( item =>
      obj[ item[ key ] ] = item
    )
  return obj
}

/***
 * This is for building the crazy one liner functional goo
 * always returns a function if found, or a blank one if not found
 * @param path {(string|string[]|number)} typical j path "path.to.deeply.nested.thing"
 * @param obj {object} base object for path
 * @returns function
 */
export function jfun ( path, source ) {
  const fun = j(path, source, undefined)
  const parent = j(path, source, undefined, 1)
  if (typeof fun === "function")
    return fun.bind(parent)
  else
    return new Function()
}

/***
 * This is for building the crazy one liner functional goo
 * always returns a function if found, or a blank one if not found
 * @param path {(string|string[]|number)} typical j path "path.to.deeply.nested.thing"
 * @param obj {object} base object for path
 * @returns function
 */
export function jhandler ( path, source, ...args ) {
  return function () {
    const fun = j(path, source, undefined)
    if (typeof fun === "function")
      return fun(...args)
  }
}

export function jthunk ( path, source ) {
  let f = () => f
  const fun = j(path, source, undefined)
  const parent = j(path, source, undefined, 1)
  if (typeof fun === "function")
    return fun.bind(parent)
  else
    return f
}

/**
 * adds nested properties into an object based on a path, the inverse of j
 *
 * @param path {string} 'path.to.thing"
 * @param base {object} base thing to add to
 * @param thing {*} value to place at path
 * @returns thing {*} returns the thing being added
 */
export const incept = (path="", base, thing, replaceParent) => {

  let arr = splitPath(path)
    , obj = base || this
    , parent = obj
    , parentKey
    , x = 0
    , p

  while (x < arr.length) {

    p = arr[x]

    if (x === arr.length - 1) {
      if (replaceParent && parentKey) {
        let ret = Object.assign({}, obj)
        ret[ p ] = thing
        return parent[parentKey] = ret
      } else {
        return obj[p] = thing
      }
    }

    else if (obj[p] === undefined) {
      parent = obj
      parentKey = p
      obj = obj[p] = {}
    } else {
      parent = obj
      parentKey = p
      obj = obj[p]
    }
    x++
  }

  return thing

}

export const inceptOnce = (path, base, thing, r) => {
  if (r = j(path, base))
    return r
  else
    return incept(path, base, thing)
}

/***
 * Only incept a property if the parent already exists
 * @param path
 * @param base
 * @param thing
 * @returns {thing}
 */
const inceptif = (path, base, thing) => {
  if (j(path, base, undefined, 1))
    return incept(path, base, thing)
}

/**
 * deletes a nested property from a nested parent
 * @param path
 * @param base
 * @param ret - optional thing to return
 * @returns parent object
 */
export const jdelete = (path, base, replaceParent) => {
  path = path || ""
  const split = splitPath(path).reverse()
    , finalKey = split[0]
    , parentKey = split[1]
    , parent = j(path, base, {}, 1)

  delete parent[ finalKey ]

  if (replaceParent) {
    j(path, base, {}, 2)[parentKey] = Object.assign({}, parent)
    return Object.assign({}, base)
  }

  return base

}

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
export const wait = (path, base, callback = new Function(), failCallback = new Function(), attempts, timeout) => {
  attempts = typeof attempts === "undefined" ? 30 : attempts
  timeout = typeof timeout === "undefined" ? 100 : timeout
  if (attempts > 0)
    return jack(path, base, callback, () => setTimeout(() => wait(path, base, callback, failCallback, attempts - 1), timeout ))
  else
    return failCallback()
}

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
export const loadScriptFile = src => {
  const id = splitPath(src).join("_").substr(1)

  if (document.getElementById(id))
    return wait

  const script = document.createElement("script")
  script.type="text/javascript"
  script.src=src

  script.id=id
  document.head.appendChild(script)
  return wait
}

export const loadStyle = src => {
  const id = splitPath(src).join("_").substr(1)

  if (document.getElementById(id))
    return wait

  const elm = document.createElement("link")
  elm.rel="stylesheet"
  elm.href=src
  elm.id=id
  document.head.appendChild(elm)
}

function pushInObj(name, item, obj) {
  if (!obj[name])
    obj[name] = []
  obj[name].push(item)
}

export const getType = thing => "_" + Object.prototype.toString.call(thing).slice(8, -1)

export const mapArguments = (args, map) => {

  map = map || {}

  for (let y = 0; y < args.length; y++)
    pushInObj( getType(args[y]), args[y], map )

  return map

}

/***
 * Client Side only {Action} to load a script file, and dispatch to redux when is done
 * @param src
 * @param path
 */
export const loadScript = (src, path) => (dispatch, getState) => {

  // if it's already loaded, just ignore it
  if (j(`globals.externalLibraries.${path}`, getState))
    return

  dispatch({ type : "EXTERNAL_LIBRARY_LOADING", payload : path })
  loadScriptFile(src)(
    path
    , window
    , () => dispatch({ type : "EXTERNAL_LIBRARY_LOADED", payload : path })
  )

}

/**
 * takes an object array and returns only unique items based on a key of the objects
 * last in overrides previous with same key, so you could push to the end of an array and have the old ones removed
 * @param arr
 * @param key
 * @param returnArr
 * @returns {Array} returnArr is supplied, or a new array if not
 */
export const uniqueByKey = (arr, key, returnArr) => {

  arr = arr || []
  key = key || ""
  returnArr = returnArr || []

  const obj = {}

  arr.forEach(item => {

    if (!item)
      return

    let i = obj[ item[key] ]

    if (i)
      return returnArr[ i - 1] = item

    // captures index, and adds to array
    obj[ item[key] ] = returnArr.push(item)

  })

  return returnArr

}

export const jconcat = base => {
  const path = Array.prototype.slice.call(arguments, 1)
    , ret = []
  path.forEach( path => {
    j(path, base, []).forEach( item => ret.push(item) )
  })
  return ret
}

/**
 * Takes a j path, and key, and applies uniqueByKey to key to returned item
 * @param path
 * @param source
 * @param key
 * @returns {Array}
 */
export const juniqueByKey = (path, source, key) => uniqueByKey( j(path, source), key )

export const junescape = (path, base, alternative) => {

  const text = j(path, base, alternative || "")

  if (typeof text !== "string")
    return text

  return text.replace(/&amp;/g, String.fromCharCode(38)) // &
    .replace(/&lt;/g, String.fromCharCode(60)) // <
    .replace(/&gt;/g, String.fromCharCode(62)) // >
    .replace(/(&quot;|&#8220;|&#8221;)/g, String.fromCharCode(34)) // "
    .replace(/(&#x27;|&#8216;|&#8217;)/g, String.fromCharCode(39)) // '
    .replace(/&#96;/g, String.fromCharCode(96)) // `
}

export { 
  j as default
}