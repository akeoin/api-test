const fs = require("fs");
const express = require('express');
const app = express();
const port = 5000;
const axios = require("axios");
require("dotenv").config();
const bystring = require("object-bystring");

var testData = JSON.parse(fs.readFileSync("data.json", "utf8"));

app.listen(port, () => {
  console.log("App is running in port ", port)
});

const instance = axios.create({
  withCredentials: true,
  baseURL: process.env.SERVER_URL,
  headers: {},
});

fs.readdir(process.env.TESTS_DIR, async (error, fileNames) => {
  if (error) throw error;
  var testResults = [];

  // Login
  await login();

  // Run Tests
  app.get('/events', async (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    for (var fileCount = 0; fileCount < fileNames.length; fileCount++) {
        console.log("fileName--------------->", fileNames);
      // Load test steps
      var testFile = fileNames[fileCount];
        console.log("TestFile Name--------------->",testFile);
      
        const data = {
          // FileName: testCase.Name,
          // Index: testStepCount,
          // Name: testStep.name,
          // API: testStep.API,
          // Method: testStep.method,
          // BeforePayload: testStep.payload,
          // ModifiedPayload: requestPayload,
          // ExpectedResponse: testStep.expectedResponse,
          // ActualResponse: testResult.data,
          // Status: testResult.httpStatus
          TestFileName:testFile
        };
        
        res.write(`data: ${JSON.stringify(data)}\n\n`);
      var testCase = JSON.parse(
        fs.readFileSync(process.env.TESTS_DIR + "/" + testFile, "utf8")
      );
      var testCaseResult = false;
      var testStepData = {};

      console.log("************ Executing Test: ", testCase.name, "*************");

      for (
        var testStepCount = 0;
        testStepCount < testCase.steps.length;
        testStepCount++
      ) {
        // Run test step
        var testStep = testCase.steps[testStepCount];
        var testResult = {};
        var requestPayload = populatePayload(testStep.payload, testStepData);
        console.log("\x1b[30m", "Run => ", testStep.name);

        if (testStep.method == "delete")
          testResult = await testDelete(testStep.api, requestPayload);
        else if (testStep.method == "post")
          testResult = await testPost(testStep.api, requestPayload);
        else if (testStep.method == "put")
          testResult = await testPut(testStep.api, requestPayload);
        else testResult = await testGet(testStep.api, requestPayload);

        testStepData[`$${testStep.name}`] = testResult.data;

        const data2 = {
          FileName: testCase.Name,
          Index: testStepCount,
          Name: testStep.name,
          API: testStep.API,
          Method: testStep.method,
          BeforePayload: testStep.payload,
          ModifiedPayload: requestPayload,
          ExpectedResponse: testStep.expectedResponse,
          ActualResponse: testResult.data,
          Status: testResult.httpStatus
        };

        res.write(`data2: ${JSON.stringify(data2)}\n\n`);

        console.log("\x1b[30m", "Response Fetched => ", testStep.name);

        // Validate result
        if (testStep.expected.status == testResult.httpStatus) {
          console.log("\x1b[30m", "Validating Response => ", testStep.name);
          testCaseResult = validateResult(testStep.expected, testStepData);
          console.log("\x1b[34m", "Validated Response => ", testCaseResult);
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
  });
});

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
        if (typeof payload[key] === "string" && payload[key].indexOf("$") == 1) {
          payload[key] = bystring(data, payload[key]);
        }
      });
    } catch (e) {
      console.log(payload, data);
      throw e;
    }
  }
  return payload;
}

function validateResult(expected, response) {
  Object.keys(expected.response).forEach((responseKey) => {
    if (
      responseKey.indexOf("$") == 1 &&
      expected.response[responseKey] != bystring(response, responseKey)
    ) {
      return false;
    } else if (
      typeof expected.response[responseKey] === "string" &&
      expected.response[responseKey].indexOf("$") == 1 &&
      bystring(response.data, expected.response[responseKey]) !=
      bystring(response.data, responseKey)
    ) {
      return false;
    } else if (
      expected.response[responseKey] != bystring(response, responseKey)
    ) {
      return false;
    }
  });
  return true;
}

function testGet(url, test) {
  return new Promise((resolve, reject) => {
    var startTime = process.hrtime();
    instance
      .get(url)
      .then((res) => {
        resolve({
          status: 1,
          httpStatus: res.status,
          duration: parseHrtimeToSeconds(process.hrtime(startTime)),
          data: res.data,
        });
      })
      .catch((err) => {
        resolve({
          status: 0,
          httpStatus: err.response ? err.response.status : 0,
          duration: parseHrtimeToSeconds(process.hrtime(startTime)),
          error: err.response ? err.response.statusText : err.code,
        });
      });
  });
}

function testPost(url, data) {
  return new Promise((resolve, reject) => {
    var startTime = process.hrtime();
    instance
      .post(url, data)
      .then((res) => {
        resolve({
          status: 1,
          httpStatus: res.status,
          duration: parseHrtimeToSeconds(process.hrtime(startTime)),
          data: res.data,
          headers: res.headers,
        });
      })
      .catch((err) => {
        resolve({
          status: 0,
          httpStatus: err.response ? err.response.status : 0,
          duration: parseHrtimeToSeconds(process.hrtime(startTime)),
          error: err.response ? err.response.statusText : err.code,
        });
      });
  });
}

function testPut(url, data) {
  return new Promise((resolve, reject) => {
    var startTime = process.hrtime();
    instance
      .put(url, data)
      .then((res) => {
        resolve({
          status: 1,
          httpStatus: res.status,
          duration: parseHrtimeToSeconds(process.hrtime(startTime)),
          data: res.data,
          headers: res.headers,
        });
      })
      .catch((err) => {
        resolve({
          status: 0,
          httpStatus: err.response ? err.response.status : 0,
          duration: parseHrtimeToSeconds(process.hrtime(startTime)),
          error: err.response ? err.response.statusText : err.code,
        });
      });
  });
}

function testDelete(url, data) {
  return new Promise((resolve, reject) => {
    var startTime = process.hrtime();
    instance
      .delete(url, data)
      .then((res) => {
        resolve({
          status: 1,
          httpStatus: res.status,
          duration: parseHrtimeToSeconds(process.hrtime(startTime)),
          data: res.data,
          headers: res.headers,
        });
      })
      .catch((err) => {
        resolve({
          status: 0,
          httpStatus: err.response ? err.response.status : 0,
          duration: parseHrtimeToSeconds(process.hrtime(startTime)),
          error: err.response ? err.response.statusText : err.code,
        });
      });
  });
}
