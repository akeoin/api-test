const fs = require("fs");
const axios = require("axios");
require("dotenv").config();
const bystring = require("object-bystring");
const streamConnection = require("./streamconnection");

const instance = axios.create({
  withCredentials: true,
  baseURL: process.env.SERVER_URL,
  headers: {},
});
  var testData = null
async function test() {
   testData = JSON.parse(fs.readFileSync("data.json", "utf8"));
   console.log("test data: ",testData)
  try {
    console.log("testData2:",testData)
    const results = await executeTests(testData);
    return results;
  } catch (error) {
    console.error("Error during tests execution:", error);
    throw error;
  }
}

async function executeTests(testData) {
  console.log("testData3", testData);
  const fileNames = fs.readdirSync(process.env.TESTS_DIR);
  const testResults = [];

  await login();

  for (const testFile of fileNames) {
    const data1 = { TestFileName: testFile };
    streamConnection.sendData(data1);

    const testCase = JSON.parse(
      fs.readFileSync(`${process.env.TESTS_DIR}/${testFile}`, "utf8")
    );
    let testCaseResult = false;
    const testStepData = {};

    console.log("************ Executing Test: ", testCase.name, "*************");

    for (const testStep of testCase.steps) {
      let testResult = {};
      const requestPayload = populatePayload(testStep.payload, testStepData);
      const requestParams = populateParams(testStep.params, testStepData);
      const requestapi = populateURL(testStep.api, testStepData);

      console.log("\x1b[30m", "Run => ", testStep.name);

      if (testStep.method === "delete") {
        testResult = await testDelete(requestapi, requestPayload);
      } else if (testStep.method === "post") {
        testResult = await testPost(requestapi, requestPayload);
      } else if (testStep.method === "put") {
        testResult = await testPut(requestapi, requestPayload);
      } else {
        testResult = await testGet(requestapi, requestPayload, requestParams);
      }

      testStepData[`$${testStep.name}`] = testResult.data;

      const data2 = {
        Index: testCase.steps.indexOf(testStep),
        Name: testStep.name,
        API: testStep.api,
        Method: testStep.method,
        BeforePayload: testStep.payload,
        ModifiedPayload: requestPayload,
        ExpectedResponse: testStep.expected,
        ActualResponse: testResult.data,
        Status: testResult.httpStatus,
      };
      console.log("Data 2-------------------------------", data2)
      streamConnection.sendData(data2);

      console.log("\x1b[30m", "Response Fetched => ", testStep.name);

      if (testStep.expected.status === testResult.httpStatus) {
        console.log("\x1b[30m", "Validating Response => ", testStep.name);
        testCaseResult = validateResult(testStep.expected, testStepData);
        console.log("\x1b[34m", "Validated Response => ", testCaseResult);
      } else {
        testCaseResult = false;
        console.log("\x1b[31m", "Invalid Status Code => ", testResult.httpStatus);
      }

      if (!testCaseResult) {
        console.log("\x1b[31m", "Failed Step => ", testStep);
        console.log("\x1b[30m", "Failed Param => ", requestPayload);
        console.log("\x1b[30m", "Failed Response => ", testResult);
      }

      console.log("\x1b[32m", "Pass => ", testStep.name);
    }

    testResults.push({ test: testCase.name, status: testCaseResult });
    console.log("\x1b[30m", "************ Completed *************");
  }

  return testResults;
}

async function login() {
  console.log("testData.adminUser", testData.adminUser);
  console.log("testData.adminPassword", testData.adminPassword);
  const loginResult = await testPost("/api/TokenAuth/AuthenticateAdmin", {
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

  if (loginResult.httpStatus !== 200) {
    throw new Error("Login failed!!");
  }
  instance.defaults.headers.Cookie = loginResult.headers["set-cookie"];

  const setTenantResult = await testPost("/api/TokenAuth/SwitchTenant", {
    tenantId: testData.tenantId,
    rememberMe: false,
    userName: testData.adminUser,
  });

  if (setTenantResult.httpStatus !== 200) {
    throw new Error("Login failed!!");
  }
  instance.defaults.headers.Cookie = setTenantResult.headers["set-cookie"];
}

function populatePayload(payload, data) {
  if (payload) {
    try {
      Object.keys(payload).forEach((key) => {
        if (typeof payload[key] === "string" && payload[key].charAt(0) === "$") {
          payload[key] = bystring(data, payload[key]);
        } else if (typeof payload[key] === "object") {
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
        if (typeof params[key] === "string" && params[key].charAt(0) === "$") {
          params[key] = bystring(data, params[key]);
        } else if (typeof params[key] === "object") {
          params[key] = populateParams(params[key], data);
        } else if (typeof params[key] === "string" && params[key].charAt(0) === "#") {
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
  if (str === "#PLACEHOLDER#") {
    return "REPLACED_VALUE";
  }
  return str;
}

function populateURL(url, data) {
  let result = url;
  if (url) {
    const urlParams = url.split("/");
    urlParams.forEach((param) => {
      if (param.charAt(0) === "$") {
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

async function makeRequest(method, url, payload, config) {
  const startTime = process.hrtime();
  try {
    const response = await instance({
      method,
      url,
      data: payload,
      ...config,
    });
    // const endTime = process.hrtime(startTime);
    // return {
    //   httpStatus: response.status,
    //   data: response.data
    // };
    const endTime = process.hrtime(startTime);
    return {
      httpStatus: response.status,
      data: response.data,
      headers: response.headers,
      duration: parseHrtimeToSeconds(endTime),
    };
  } catch (error) {
    if (error.response) {
      const endTime = process.hrtime(startTime);
      return {
        httpStatus: error.response.status,
        data: error.response.data,
        headers: error.response.headers,
        duration: parseHrtimeToSeconds(endTime),
      };
    } else {
      throw error;
    }
  }
}

function parseHrtimeToSeconds(hrtime) {
  return (hrtime[0] + hrtime[1] / 1e9).toFixed(3);
}

function validateResult(expected, actual) {
  // Implement your validation logic here
  return JSON.stringify(expected) === JSON.stringify(actual);
}

module.exports = {
  test,
};
