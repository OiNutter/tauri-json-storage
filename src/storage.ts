/*
 * The MIT License
 *
 * Copyright (c) 2016 Juan Cruz Viotti. https://github.com/jviotti
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */

'use strict';

/**
 * @module storage
 */

import {fs, path} from "@tauri-apps/api"
import { createDir, removeDir, removeFile, writeFile } from "@tauri-apps/api/fs";
import { dirname, extname, join } from "@tauri-apps/api/path";
import { partial } from "lodash";
import { StorageOptions, WriteOptions } from "./types";
import { getDataPath, getFileName } from "./utils";
//const writeFileAtomic = require('write-file-atomic');
//const lock = require('./lock');

const sleep = async (time) => {
  return (new Promise<void>((resolve) => {
    setTimeout(() => {
      resolve()
    }, time)
  }))
}

const readFile = async function(fileName: string, times:number = 0) : Promise<string> {
  
  try {
    return await fs.readTextFile(fileName)
  } catch (error) {
    
    if (error.code === 'ENOENT')
      return JSON.stringify({});
    
    if (error.code === 'EPERM' && times < 10) {
      await sleep(1000)
      return await readFile(fileName, times + 1);
    }

    throw error;
  };
};

/**
 * @summary Read user data
 * @function
 * @public
 *
 * @description
 * If the key doesn't exist in the user data, an empty object is returned.
 * Also notice that the `.json` extension is added automatically, but it's
 * ignored if you pass it yourself.
 *
 * Passing an extension other than `.json` will result in a file created
 * with both extensions. For example, the key `foo.data` will result in a file
 * called `foo.data.json`.
 *
 * @param {String} key - key
 * @param {Object} [options] - options
 * @param {String} [options.dataPath] - data path
 * @param {Function} callback - callback (error, data)
 *
 * @example
 * const storage = require('electron-json-storage');
 *
 * storage.get('foobar', function(error, data) {
 *   if (error) throw error;
 *
 *   console.log(data);
 * });
 */
export async function get(key: string, options:StorageOptions = {}) {
  //let fileName: string | undefined;

  const fileName = await getFileName(key, {
    dataPath: options.dataPath
  })

  await createDir(await dirname(fileName), { recursive: true});
  /*lock.lock(utils.getLockFileName(fileName), function(error) {
        if (error && error.code === 'EEXIST') {
          return exports.get(key, options, callback);
        }

        return next(error);
      });*/
  const parsed = JSON.parse(await readFile(fileName));
  
  /*lock.unlock(utils.getLockFileName(fileName), function(lockError) {
    if (error) {
      return callback(error);
    }

    return callback(lockError, result);
  });*/
  return parsed
};

/**
 * @summary Read many user data keys
 * @function
 * @public
 *
 * @description
 * This function returns an object with the data of all the passed keys.
 * If one of the keys doesn't exist, an empty object is returned for it.
 *
 * @param {String[]} keys - keys
 * @param {Object} [options] - options
 * @param {String} [options.dataPath] - data path
 * @param {Function} callback - callback (error, data)
 *
 * @example
 * const storage = require('electron-json-storage');
 *
 * storage.getMany([ 'foobar', 'barbaz' ], function(error, data) {
 *   if (error) throw error;
 *
 *   console.log(data.foobar);
 *   console.log(data.barbaz);
 * });
 */
export async function getMany(keys: string[], options: StorageOptions = {}) {
  
  return keys.reduce(async function(prev, key) {
    prev[key] = await get(key, options)
    return prev
  }, {})

};

/**
 * @summary Read all user data
 * @function
 * @public
 *
 * @description
 * This function returns an empty object if there is no data to be read.
 *
 * @param {Object} [options] - options
 * @param {String} [options.dataPath] - data path
 * @param {Function} callback - callback (error, data)
 *
 * @example
 * const storage = require('electron-json-storage');
 *
 * storage.getAll(function(error, data) {
 *   if (error) throw error;
 *
 *   console.log(data);
 * });
 */
export async function getAll(options:StorageOptions = {}): Promise<{[key:string]:unknown}> {
  const found = await keys(options)
  return found.reduce(async (prev: {}, key: string) => {
    prev[key] = await get(key, options)
  }, {})
};

/**
 * @summary Write user data
 * @function
 * @public
 *
 * @param {String} key - key
 * @param {Object} json - json object
 * @param {Object} [options] - options
 * @param {String} [options.dataPath] - data path
 * @param {String} [options.validate] - validate writes by reading the data back
 * @param {boolean} [options.prettyPrinting] - adds line breaks and spacing to the written data
 * @param {Function} callback - callback (error)
 *
 * @example
 * const storage = require('electron-json-storage');
 *
 * storage.set('foobar', { foo: 'bar' }, function(error) {
 *   if (error) throw error;
 * });
 */
export async function set(key, json, options: WriteOptions = {}, retries: Number = 10) {
  
  const {
    dataPath,
    validate,
    prettyPrinting
  } = options

  const fileName = await getFileName(key, {
    dataPath
  })

  const data = JSON.stringify(json, null, (prettyPrinting) ? 2 : 0)

  if (!data)
    throw new Error("Invalid JSON data")

  await createDir(await dirname(fileName), { recursive: true})
  /* lock.lock(utils.getLockFileName(fileName), function(error) {
        if (error && error.code === 'EEXIST') {
          return exports.set(key, json, options, callback);
        }

        return next(error, fileName, data);
      }); */
  
  // TODO: replace with tauri version of write-file-atomic
  await writeFile({
    contents: data,
    path: fileName
  })

  /*lock.unlock(utils.getLockFileName(fileName), function(lockError) {
      if (error) {
        return callback(error);
      }

      if (!options.validate) {
        return callback(lockError);
      }

      // Check that the writes were actually successful
      // after a little bit
      setTimeout(function() {
        exports.get(key, {
          dataPath: options.dataPath
        }, function(getError, data) {
          if (getError) {
            return callback(getError);
          }

          if (!_.isEqual(data, json)) {
            if (retries <= 0) {
              throw new Error('Couldn\'t ensure data was written correctly');
            }

            return exports.set(key, json, options, callback, retries - 1);
          }

          return callback();
        });
      }, 100);
    });*/
};

/**
 * @summary Check if a key exists
 * @function
 * @public
 *
 * @param {String} key - key
 * @param {Object} [options] - options
 * @param {String} [options.dataPath] - data path
 * @param {Function} callback - callback (error, hasKey)
 *
 * @example
 * const storage = require('electron-json-storage');
 *
 * storage.has('foobar', function(error, hasKey) {
 *   if (error) throw error;
 *
 *   if (hasKey) {
 *     console.log('There is data stored as `foobar`');
 *   }
 * });
 */
export async function has(key: string, options:StorageOptions = {}) {
  
  const filename = await getFileName(key, options)

  try {
    // TODO: find a way to use stat instead?
    await readFile(filename)
    return true
  } catch (e) {
    if (e.code === 'ENOENT')
      return false

    throw e
  }
};

/**
 * @summary Get the list of saved keys
 * @function
 * @public
 *
 * @param {Object} [options] - options
 * @param {String} [options.dataPath] - data path
 * @param {Function} callback - callback (error, keys)
 *
 * @example
 * const storage = require('electron-json-storage');
 *
 * storage.keys(function(error, keys) {
 *   if (error) throw error;
 *
 *   for (var key of keys) {
 *     console.log('There is a key called: ' + key);
 *   }
 * });
 */
export async function keys(options: StorageOptions = {}) {

  const userDataPath = options.dataPath || await getDataPath()

  await createDir(userDataPath, { recursive: true })

  const keys = await fs.readDir(userDataPath)
  const jsonFiles = keys.filter(async (key) => {
    return await extname(key.name) === '.json'
  })
  return jsonFiles.map((f) => {
    return f.name
  })
};

/**
 * @summary Remove a key
 * @function
 * @public
 *
 * @description
 * Notice this function does nothing, nor throws any error
 * if the key doesn't exist.
 *
 * @param {String} key - key
 * @param {Object} [options] - options
 * @param {String} [options.dataPath] - data path
 * @param {Function} callback - callback (error)
 *
 * @example
 * const storage = require('electron-json-storage');
 *
 * storage.remove('foobar', function(error) {
 *   if (error) throw error;
 * });
 */
export async function remove(key: string, options: StorageOptions = {}) {
  const filename = await getFileName(key, options)
  await removeFile(filename)
};

/**
 * @summary Clear all stored data in the current user data path
 * @function
 * @public
 *
 * @param {Object} [options] - options
 * @param {String} [options.dataPath] - data path
 * @param {Function} callback - callback (error)
 *
 * @example
 * const storage = require('electron-json-storage');
 *
 * storage.clear(function(error) {
 *   if (error) throw error;
 * });
 */
export async function clear(options:StorageOptions = {}) {
  const userData = options.dataPath || await getDataPath();
  const jsonFiles = await join(userData, '*.json');

  await removeDir(jsonFiles);
};
