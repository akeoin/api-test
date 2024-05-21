const fs = require("fs");
const axios = require("axios");
require("dotenv").config();
const jsonexport = require("jsonexport");
const bystring = require("object-bystring");
const { log } = require("console");
const XLSX = require('xlsx');
const cors = require("cors");
const express = require("express");
const FormData = require("form-data");
const streamConnection = require('./streamconnection'); // Import the streaming connection module

var args = process.argv.slice(2);
var apilist = new Set();
var swaggerAPIs = [];
const port = 5001;
const app = express();

app.use(cors());
var testData = JSON.parse(fs.readFileSync("data.json", "utf8"));

app.listen(port, () => {
  console.log("Server is listening on port", port);
});

const instance = axios.create({
  withCredentials: true,
  baseURL: process.env.SERVER_URL,
  headers: {},
});
// async function Testing(){
  console.log("we are in test function")
fs.readdir(process.env.TESTS_DIR, async (error, fileNames) => {
  if (error) throw error;
  var testResults = [];
  
  // Login
  await login();

  // Run Tests

  
  for (var fileCount = 0; fileCount < fileNames.length; fileCount++) {
    // Load test steps
    var testFile = fileNames[fileCount];
    const data1 = {
      TestFileName: testFile
    };
    streamConnection.sendData(data1); // Send data through the stream connection

    var testCase = JSON.parse(fs.readFileSync(process.env.TESTS_DIR + "/" + testFile, "utf8"));
    var testCaseResult = false;
    var testStepData = {};

    console.log("************ Executing Test: ", testCase.name, "*************");

    for (var testStepCount = 0; testStepCount < testCase.steps.length; testStepCount++) {
      // Run test step
      var testStep = testCase.steps[testStepCount];
      var testResult = {};
      console.log('Before Payload Update', testStep.payload);
      var requestPayload = populatePayload(testStep.payload, testStepData);
      var requestParams = populateParams(testStep.params, testStepData);
      var requestapi = populateURL(testStep.api, testStepData);
      console.log('After Payload Update', requestPayload);

      console.log("\x1b[30m", "Run => ", testStep.name);

      if (testStep.method == "delete")
        testResult = await testDelete(requestapi, requestPayload);
      else if (testStep.method == "post")
        testResult = await testPost(requestapi, requestPayload);
      else if (testStep.method == "put")
        testResult = await testPut(requestapi, requestPayload);
      else testResult = await testGet(requestapi, requestPayload, requestParams);

      testStepData[`$${testStep.name}`] = testResult.data;
      const data2 = {
        Index: testStepCount,
        Name: testStep.name,
        API: testStep.API,
        Method: testStep.method,
        BeforePayload: testStep.payload,
        ModifiedPayload: requestPayload,
        ExpectedResponse: testStep.expected,
        ActualResponse: testResult.data,
        Status: testResult.httpStatus
      };
      streamConnection.sendData(data2); // Send data through the stream connection

      console.log("\x1b[30m", "Response Fetched => ", testStep.name);

      // Validate result
      if (testStep.expected.status == testResult.httpStatus) {
        console.log("\x1b[30m", "Validating Response => ", testStep.name);
        testCaseResult = validateResult(testStep.expected, testStepData);
        console.log("\x1b[34m", "Validated Response => ", testCaseResult);
        console.log("\x1b[30m", " Response Time => ", testResult.duration);
        console.log("\x1b[30m", " Response Time => ", testResult);
      } else {
        testCaseResult = false;
        console.log("\x1b[31m", "Invalid Status Code => ", testResult.httpStatus);
      }

      if (testCaseResult == false) {
        console.log("\x1b[31m", "Failed Step => ", testStep);
        console.log("\x1b[30m", "Failed Param => ", requestPayload);
        console.log("\x1b[30m", "Failed Response => ", testResult);
        testCaseResult = false;
      }
      console.log("\x1b[32m", "Pass => ", testStep.name);
    }

    testResults.push({ test: testCase.name, status: testCaseResult });
    console.log("\x1b[30m", "************ Completed *************");
  }


  

  // Save results
  // jsonexport(testResults, function (err, csv) {
  //   if (err) return console.error(err);
  //   const outputFile = "results/test_result_" + new Date().getTime() + ".csv";
  //   fs.writeFile(outputFile, csv, function (err) {
  //     if (err) return console.error(err);
  //     console.log("\x1b[30m", "Results saved at ", outputFile);
  //   });
  // });
  apilist = Array.from(apilist);
  // fetchSwaggerJSON(swaggerJSONUrl)
    // .then((swaggerData) => {
    //   const extractedPaths = extractPaths(swaggerData);
    //   console.log("List of Extracted Paths:");
    //   extractedPaths.forEach((path) => {
    //     swaggerAPIs.push(path);
    //   });
    //   createExcelFile(Array.from(apilist), swaggerAPIs);
    // })
    // .catch((error) => {
    //   console.error("Error:", error);
    // });
});

// module.exports={Testing}

async function login() {
  var loginResult = await testPost("/api/TokenAuth/AuthenticateAdmin", {
    emailAddress: testData.adminUser,
    phoneNumber: "",
    countryCode: "",
    password: testData.adminPassword,
    isMobileRequest: false,
    deviceId: "",
    tenantId: 0,
    isSwaggerLogin: true,
    rememberMe: true,
  });

  if (loginResult.httpStatus != "200") {
    throw "Login failed!!";
  }
  instance.defaults.headers.Cookie = loginResult.headers["set-cookie"];

  var setTenantResult = await testPost("/api/TokenAuth/SwitchTenant", {
    tenantId: testData.tenantId,
    rememberMe: false,
    userName: testData.adminUser,
  });
  if (setTenantResult.httpStatus != "200") {
    throw "Login failed!!";
  }
  instance.defaults.headers.Cookie = setTenantResult.headers["set-cookie"];
}

function parseHrtimeToSeconds(hrtime) {
  var seconds = (hrtime[0] + hrtime[1] / 1e9).toFixed(3);
  return seconds;
}

function populatePayload(payload, data) {
  if (payload) {
    try {
      Object.keys(payload).forEach((key) => {
        if (typeof payload[key] === "string" && payload[key].charAt(0) === '$') {
          payload[key] = bystring(data, payload[key]);
        } else if (typeof payload[key] === 'object') {
          payload[key] = populatePayload(payload[key], data);
        }
      });
    } catch (e) {
      console.log(payload, data);
      throw e;
    }
  }
  return payload;
}

function populateParams(params, data) {
  if (params) {
    try {
      Object.keys(params).forEach((key) => {
        if (typeof params[key] === "string" && params[key].charAt(0) === '$') {
          params[key] = bystring(data, params[key]);
        } else if (typeof params[key] === 'object') {
          params[key] = populateParams(params[key], data);
        } else if (typeof params[key] === "string" && params[key].charAt(0) === '#') {
          params[key] = replacePlaceholders(params[key]);
        }
      });
    } catch (e) {
      console.log(params, data);
      throw e;
    }
  }
  return params;
}

function replacePlaceholders(str) {
  if (str === '#PLACEHOLDER#') {
    return 'REPLACED_VALUE';
  }
  return str;
}

function populateURL(url, data) {
  var result = url;
  if (url) {
    const urlParams = url.split('/');
    urlParams.forEach((param) => {
      if (param.charAt(0) == '$') {
        result = result.replace(param, bystring(data, param));
      }
    });
  }
  return result;
}

async function testGet(url, payload, params) {
  return makeRequest("get", url, payload, { params });
}

async function testPost(url, payload) {
  return makeRequest("post", url, payload);
}

async function testPut(url, payload) {
  return makeRequest("put", url, payload);
}

async function testDelete(url, payload) {
  return makeRequest("delete", url, payload);
}

async function makeRequest(method, url, payload = null, options = {}) {
  const startTime = process.hrtime();
  try {
    const response = await instance[method](url, payload, options);
    const endTime = process.hrtime(startTime);
    const duration = parseHrtimeToSeconds(endTime);
    return {
      status: 1,
      httpStatus: response.status,
      duration,
      data: response.data,
      headers: response.headers,
    };
  } catch (err) {
    const endTime = process.hrtime(startTime);
    const duration = parseHrtimeToSeconds(endTime);
    return {
      status: 0,
      httpStatus: err.response ? err.response.status : 0,
      duration,
      error: err.response ? err.response.statusText : err.code,
    };
  }
}

function validateResult(expected, actual) {
  return JSON.stringify(expected) === JSON.stringify(actual);
}

async function fetchSwaggerJSON(url) {
  const response = await axios.get(url);
  return response.data;
}

function extractPaths(swaggerData) {
  return Object.keys(swaggerData.paths);
}

function createExcelFile(apilist, swaggerAPIs) {
  const workbook = XLSX.utils.book_new();
  const apiListSheet = XLSX.utils.aoa_to_sheet(apilist.map((api, index) => [index + 1, api]));
  const swaggerSheet = XLSX.utils.aoa_to_sheet(swaggerAPIs.map((api, index) => [index + 1, api]));

  XLSX.utils.book_append_sheet(workbook, apiListSheet, 'API List');
  XLSX.utils.book_append_sheet(workbook, swaggerSheet, 'Swagger APIs');

  XLSX.writeFile(workbook, 'api_list.xlsx');
}

