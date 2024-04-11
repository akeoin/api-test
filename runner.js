var fs = require("fs");
const axios = require("axios");
require("dotenv").config();
const jsonexport = require("jsonexport");
const bystring = require("object-bystring");

var args = process.argv.slice(2);
var swaggerDoc = JSON.parse(fs.readFileSync(args[0], "utf8"));
var testData = JSON.parse(fs.readFileSync("data.json", "utf8"));

const instance = axios.create({
  withCredentials: true,
  baseURL: process.env.SERVER_URL,
  headers: {},
});

//read directory
fs.readdir(process.env.TESTS_DIR, async (error, fileNames) => {
  if (error) throw error;
  var testResults = [];

  // Login
  await login();

  // Run Tests
  for (var fileCount = 0; fileCount < fileNames.length; fileCount++) {
    // Load test steps
    var testFile = fileNames[fileCount];
    var testCase = JSON.parse(fs.readFileSync(process.env.TESTS_DIR + "/" + testFile, "utf8"));
    var testCaseResult = false;

    // Execute test steps
    for (var testCaseCount = 0; testCaseCount < testCase.steps.length; testCaseCount++) {

        // Run test step
        var testStep = testCase.steps[testCaseCount];
        var testResult = {};

        if(testStep.method == "delete") testResult = await testDelete(testStep.api, testStep.payload);
        else if(testStep.method == "post") testResult = await testPost(testStep.api, testStep.payload);
        else if(testStep.method == "put") testResult = await testPut(testStep.api, testStep.payload);
        else testResult = await testGet(testStep.api, testStep.payload);

        console.log(testResult)

        // Validate result
        testCaseResult = validateResult(testStep.expected, testResult);
        

        //   if (swaggerDoc.paths[apiPath].get != null) {
        //   }
    }
    testResults.push({ test: testCase.name, status: testCaseResult });


    // Save results
    jsonexport(testResults, function (err, csv) {
      if (err) return console.error(err);
      const outputFile = "results/test_result_" + new Date().getTime() + ".csv";
      fs.writeFile(outputFile, csv, function (err) {
        if (err) return console.error(err);
        console.log("Results saved at ", outputFile);
      });
    });
  }
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

function validateResult(expected, response) {
  // return false if incorrect status
  if (expected.status != response.httpStatus) return false;
  Object.keys(expected.response).forEach((responseKey) => {
    // return false if expected is not same
    if (expected.response[responseKey] != bystring(response.data, responseKey))
      return false;
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