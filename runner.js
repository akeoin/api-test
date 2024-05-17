var fs = require("fs");
const axios = require("axios");
const http = require("http");
const express = require("express");
require("dotenv").config();
const jsonexport = require("jsonexport");
const bystring = require("object-bystring");
const cors = require("cors");

var args = process.argv.slice(2);
const app = express();

const port = 5000;
app.use(cors());
// var swaggerDoc = JSON.parse(fs.readFileSync(args[0], "utf8"));
var testData = JSON.parse(fs.readFileSync("data.json", "utf8"));
app.listen(port,()=>{
  console.log("Server is listen on port", port);
})
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
  app.get('/events',async(req,res)=>{
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

  // Run Tests
  for (var fileCount = 0; fileCount < fileNames.length; fileCount++) {

    // Load test steps
    var testFile = fileNames[fileCount];

    const data1 = {
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
    res.write(`data: ${JSON.stringify(data1)}\n\n`);

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

      // check['test'] = {...check,testResult};
      testStepData[`$${testStep.name}`] = testResult.data;
      const data2 = {
        // FileName: testCase.Name,
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
      res.write(`data: ${JSON.stringify(data2)}\n\n`);
      // res.write(`data2: lakshya\n\n`);
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
        break;
      }
      console.log("\x1b[32m", "Pass => ", testStep.name);
    }

    testResults.push({ test: testCase.name, status: testCaseResult });
    console.log("\x1b[30m","************ Completed *************");
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

//read directory
function populatePayload(payload, data) {
  if(payload) {
    try {
      Object.keys(payload).forEach((key) => {
        if (typeof payload[key] === "string" && payload[key].indexOf("$") == 1) {
          payload[key] = bystring(data, payload[key]);
        }
      });
    } catch(e){
      console.log(payload,data);
      throw e;
    }
  }
  return payload;
}

function validateResult(expected, response) {
  // return false if incorrect status
  //if (expected.status != response.httpStatus) return false;

  // return false if expected is not same
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
    // data = populatePayload(data)
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
    // var changeData = data;
    // data = populatePayload(changeData)
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
    var changeData = data;
    //data = populatePayload(changeData)
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
    var changeData = data;
    //data = populatePayload(changeData)
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
