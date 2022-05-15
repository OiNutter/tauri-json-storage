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

import { isNil, isString } from "lodash"
import {path} from "@tauri-apps/api"

/**
 * @summary Get the default data path
 * @function
 * @public
 *
 * @returns {String} default data path
 *
 * @example
 * const defaultDataPath = utils.getDefaultDataPath()
 */
export async function getDefaultDataPath(): Promise<string> {
  return path.join(await path.dataDir(), 'storage');
};

/**
 * @summary The current data path
 * @type {String}
 */
let currentDataPath: string | undefined;

/**
 * @summary Set default data path
 * @function
 * @public
 *
 * @param {String} directory - directory
 *
 * @example
 * const os = require('os');
 * utils.setDataPath(os.tmpdir());
 */
export async function setDataPath(directory: string) : Promise<void> {
  if (isNil(directory)) {
    currentDataPath = undefined;
    return;
  }

  if ((!await path.isAbsolute(directory))) {
    throw new Error('The user data path should be an absolute path');
  }

  currentDataPath = await path.normalize(directory);

};

/**
 * @summary Get data path
 * @function
 * @public
 *
 * @returns {Strings} data path
 *
 * @example
 * const dataPath = utils.getDataPath();
 * console.log(dataPath);
 */
export async function getDataPath() : Promise<string> {
  return (new Promise((resolve) => resolve(currentDataPath))) || await (getDefaultDataPath());
};

/**
 * @summary Get storage file name for a key
 * @function
 * @public
 *
 * @param {String} key - key
 * @param {Object} [options] - options
 * @param {String} [options.dataPath] - custom data path
 * @returns {String} file name
 *
 * @example
 * let fileName = utils.getFileName('foo');
 * console.log(fileName);
 */
export async function getFileName(key: string, options: {dataPath?: string} = {}) : Promise<string> {
  
  if (!key) {
    throw new Error('Missing key');
  }

  if (!isString(key) || key.trim().length === 0) {
    throw new Error('Invalid key');
  }

  // Trick to prevent adding the `.json` twice
  // if the key already contains it.
  const keyFileName = await path.basename(key, '.json') + '.json';

  // Prevent ENOENT and other similar errors when using
  // reserved characters in Windows filenames.
  // See: https://en.wikipedia.org/wiki/Filename#Reserved%5Fcharacters%5Fand%5Fwords
  const escapedFileName = encodeURIComponent(keyFileName)
    .replace(/\*/g, '-').replace(/%20/g, ' ');

  const dataPath = options.dataPath || await getDataPath();
  if (!dataPath) {
    throw new Error('You must explicitly set a data path');
  }

  return await path.join(dataPath, escapedFileName);
};

/**
 * @summary Get the lock file out of a file name
 * @function
 * @public
 *
 * @param {String} fileName - file name
 * @returns {String} lock file name
 *
 * @example
 * let lockFileName = utils.getLockFileName('foo');
 * console.log(lockFileName);
 */
export function getLockFileName(fileName) : string {
  return `${fileName}.lock`;
};
