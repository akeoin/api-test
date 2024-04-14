// httpClient.js
'use strict';
const axios = require("axios");

module.exports = class HttpClient {
  instance(baseURL, headers, withCredentials) {
    return (instance = axios.create({
      withCredentials: withCredentials,
      baseURL: baseURL,
      headers: headers,
    }));
  }
  get(url, params, options) {}
  put(url, params, options) {}
  post(url, params, options) {}
  delete(url, params, options) {}
};