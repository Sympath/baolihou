import { getCookie } from './utils';
import { MOCKCOOKIEKEY, MOCKINFOCOOKIEKEY } from './utils/constance';

// const MOCKENV = 'MOCKENV';
// const GETSTORAGE = 'GET_STORAGE';
// const MessageFromInjectedScript = 'MessageFromInjectedScript';
// const MessageFromContentScript = 'MessageFromContentScript';
// const MessageToInjectedScript = 'MessageToInjectedScript';
// const MessageToContentScript = 'MessageToContentScript';
// const storageKey = 'fs-mock';
// const browserMockFlagKey = 'browserMockFlag';
let mockUrl = `https://snapshot.alibaba-inc.com/api/public/request/interceptor`;
const xhrMockFailAPI = 'xhr-mock-fail-api';
// const browserMockFlag =
//   localStorage.getItem(browserMockFlagKey) === 'false' ? false : true;
const browserMockFlag = true;

// 根据配置信息 设置当前状态
function handleMockInfo(ssrmockInfo) {
  const { env } = ssrmockInfo;
  if (env === 'local') {
    mockUrl = `http://localhost:8000/api/public/request/interceptor`;
  }
  if (env === 'pre') {
    mockUrl = `https://pre-snapshot.alibaba-inc.com/api/public/request/interceptor`;
  }
}
function parseForMtop(url = '') {
  const urlParams = new URLSearchParams(url);
  const api = urlParams.get('api') || '';
  return api;
}
function parseForData(encodedData) {
  if (!encodedData) {
    return {};
  }
  // 去掉前缀 "data="，如果有的话
  if (encodedData.startsWith('data=')) {
    encodedData = encodedData.substring(5);
  }

  // URL 解码
  const decodedData = decodeURIComponent(encodedData);

  // JSON 解析
  try {
    const jsonData = JSON.parse(decodedData);
    return jsonData;
  } catch (error) {
    console.error('JSON 解析错误:', error);
    return null;
  }
}
function parseWrap(methodParams) {
  const [, options] = methodParams; // url options {body headers method}
  const { body, headers } = options || {};
  const result = JSON.parse(body || '{}');
  return {
    ...result,
    headers,
  };
}
function parse(requestUrl, requestBody) {
  let data = {};
  const api = parseForMtop(requestUrl);
  if (requestBody) {
    data = parseForData(requestBody);
  }
  return {
    data,
    api,
  };
}

function getRequestParams(requestUrl, requestBody, type, headers) {
  let params;
  switch (type) {
    case 'fetch':
    case 'xhr': {
      const { api, data } = parse(requestUrl, requestBody);
      params = {
        api,
        apiType: 'MTOP',
        requestParams: data,
        requestHeaders: headers,
        mockCaseId: ssrmockId,
      };
      break;
    }
  }
  return params;
}

function getFullRequest(requestUrl, requestBody, type, headers) {
  let result;
  const params = getRequestParams(requestUrl, requestBody, type, headers);
  switch (type) {
    case 'fetch':
    case 'xhr':
      result = [
        mockUrl,
        {
          headers: {
            'Content-Type': 'application/json',
          },
          method: 'POST',
          body: JSON.stringify(params),
          dataType: 'json',
        },
      ];
      break;
    default:
      break;
  }
  return {
    requestConfig: result,
    params,
  };
}

const targetApis = [
  'mtop.trip.hotel.hotelSearchV2',
  'mtop.trip.hotel.hotelhome',
  'mtop.trip.hotel.hotelHome.channelv2',
];

// const ignoreHosts = ['alibaba-inc.com'];
const matchAll = true; // 是否匹配所有
const ssrmockId = getCookie(MOCKCOOKIEKEY);
// 信息对象
const ssrmockInfo = getCookie(MOCKINFOCOOKIEKEY);
if (ssrmockInfo) {
  handleMockInfo(JSON.parse(ssrmockInfo));
}

export default (setMockApis) => {
  // 1. 判断是否需要mock: ssrmockId存在才进行mock
  if (ssrmockId) {
    const originalFetch = window.fetch;
    const handleFetchDataCenter = async (
      requestUrl,
      requestBody,
      type = 'fetch',
      headers,
    ) => {
      let response;
      const { requestConfig: result, params } = getFullRequest(
        requestUrl,
        requestBody,
        type,
        headers,
      );
      if (!params.api) {
        return;
      }
      // @ts-ignore
      const mockResponse = await originalFetch(...(result || {}));
      if (mockResponse && mockResponse.ok) {
        const mockData = await mockResponse.json();
        const { succeed, data = {} } = mockData || {};
        if (succeed) {
          const mockResult = {
            api: params.api,
            data,
            ret: ['SUCCESS::调用成功'],
            traceId: 'mock data',
            v: '1.0',
          };
          if (type === 'fetch') {
            response = new Response(JSON.stringify(mockResult), {
              status: 200,
              statusText: 'OK',
              headers: { 'Content-Type': 'application/json' },
            });
          } else if (type === 'xhr') {
            response = mockResult;
          }
        } else {
          // throw new Error("获取数据中心mock配置失败"); // 抛出错误，可根据实际情况处理
        }
        setMockApis([
          {
            api: params.api,
            succeed,
          },
        ]);
      } else {
        // throw new Error("获取数据中心mock配置失败"); // 抛出错误，可根据实际情况处理
      }
      return response;
    };
    window.fetch = async function (...methodParams) {
      let response;
      try {
        // 2. 判断是否需要mock: 在目标接口中才进行mock

        const { requestUrl, requestBody, headers } = parseWrap(methodParams);
        const { api } = parse(requestUrl, requestBody);
        if (browserMockFlag) {
          if (targetApis.some((i) => i !== api) || matchAll) {
            response = await handleFetchDataCenter(
              requestUrl,
              requestBody,
              'fetch',
              headers,
            );
          } else {
            response = originalFetch(...methodParams);
          }
        } else {
          response = originalFetch(...methodParams);
        }
      } catch (error) {
        response = originalFetch(...methodParams);
        console.error('Failed to fetch mock data', error);
      }
      return response;
    };
    const _open = window.XMLHttpRequest.prototype.open;
    const _send = window.XMLHttpRequest.prototype.send;
    window.XMLHttpRequest.prototype.send = async function (
      ...sendMethodParams
    ) {
      try {
        const [requestBody] = sendMethodParams;
        const [, requestUrl] = this._methodParams;
        // 判断是否需要 mock: 在目标接口中才进行 mock
        if (browserMockFlag) {
          if (targetApis.some((i) => requestUrl.includes(i)) || matchAll) {
            const finnalMockResponse = await handleFetchDataCenter(
              requestUrl,
              requestBody,
              'xhr',
              {},
            ).catch((error) => {
              console.error('mock ui | Failed to fetch mock data', error);
            });

            if (finnalMockResponse) {
              this.open(this._methodParams[0], xhrMockFailAPI);
              Object.defineProperty(this, 'response', { writable: true });
              Object.defineProperty(this, 'status', { writable: true });
              Object.defineProperty(this, 'readyState', { writable: true });
              Object.defineProperty(this, 'responseText', { writable: true });
              // finnalMockResponse.data.channels[0].hotelName =
              //   "7天优品·自贡汽车总站店 mock";
              this.status = 200;
              this.readyState = 4;
              this.response = JSON.stringify(finnalMockResponse);
              this.responseText = JSON.stringify(finnalMockResponse);
            }
          }
        }
      } catch (error) {
        console.error('mock ui | Failed to fetch mock data', error);
      }
      return _send.apply(this, sendMethodParams);
    };
    window.XMLHttpRequest.prototype.open = function (...methodParams) {
      this._methodParams = methodParams;
      return _open.apply(this, methodParams);
    };
  }
};
