// ==UserScript==
// @name        My Script
// @namespace   Violentmonkey Scripts
// @description This is a userscript.
// @match       *://*/*
// @version     0.0.0
// @author      yuyuan
// @require     https://cdn.jsdelivr.net/npm/@violentmonkey/dom@2
// @require     https://cdn.jsdelivr.net/npm/@violentmonkey/ui@0.7
// @require     https://cdn.jsdelivr.net/npm/@violentmonkey/dom@2/dist/solid.min.js
// @downloadURL https://code.alibaba-inc.com/rxpi/snapshot-mock-extension/raw/main/dist/awesome-script.user.js
// @grant       GM_addStyle
// ==/UserScript==

(function (web, solidJs, ui) {
'use strict';

function _extends() {
  return _extends = Object.assign ? Object.assign.bind() : function (n) {
    for (var e = 1; e < arguments.length; e++) {
      var t = arguments[e];
      for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]);
    }
    return n;
  }, _extends.apply(null, arguments);
}

// 读取cookies
function getCookie(name) {
  if (document && document.cookie) {
    let arr;
    const reg = new RegExp('(^| )' + name + '=([^;]*)(;|$)');
    if (arr = document.cookie.match(reg)) return unescape(arr[2]);else return null;
  }
}
function delCookie(name) {
  if (document && document.cookie) {
    const exp = new Date();
    exp.setTime(exp.getTime() - 1);
    const cval = getCookie(name);
    if (cval != null)
      // @ts-ignore
      document.cookie = name + '=' + cval + ';path=/;domain=.taobao.com;expires=' +
      // @ts-ignore
      exp.toGMTString();
  }
}

const MOCKCOOKIEKEY = 'hotel_snapshot_ssr_mock_id';
const MOCKINFOCOOKIEKEY = 'hotel_snapshot_ssr_mock_info';

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
  const {
    env
  } = ssrmockInfo;
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
  const {
    body,
    headers
  } = options || {};
  const result = JSON.parse(body || '{}');
  return _extends({}, result, {
    headers
  });
}
function parse(requestUrl, requestBody) {
  let data = {};
  const api = parseForMtop(requestUrl);
  if (requestBody) {
    data = parseForData(requestBody);
  }
  return {
    data,
    api
  };
}
function getRequestParams(requestUrl, requestBody, type, headers) {
  let params;
  switch (type) {
    case 'fetch':
    case 'xhr':
      {
        const {
          api,
          data
        } = parse(requestUrl, requestBody);
        params = {
          api,
          apiType: 'MTOP',
          requestParams: data,
          requestHeaders: headers,
          mockCaseId: ssrmockId$1
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
      result = [mockUrl, {
        headers: {
          'Content-Type': 'application/json'
        },
        method: 'POST',
        body: JSON.stringify(params),
        dataType: 'json'
      }];
      break;
  }
  return {
    requestConfig: result,
    params
  };
}
const targetApis = ['mtop.trip.hotel.hotelSearchV2', 'mtop.trip.hotel.hotelhome', 'mtop.trip.hotel.hotelHome.channelv2'];

// const ignoreHosts = ['alibaba-inc.com'];
const matchAll = true; // 是否匹配所有
const ssrmockId$1 = getCookie(MOCKCOOKIEKEY);
// 信息对象
const ssrmockInfo = getCookie(MOCKINFOCOOKIEKEY);
if (ssrmockInfo) {
  handleMockInfo(JSON.parse(ssrmockInfo));
}
var test = setMockApis => {
  // 1. 判断是否需要mock: ssrmockId存在才进行mock
  if (ssrmockId$1) {
    const originalFetch = window.fetch;
    const handleFetchDataCenter = async (requestUrl, requestBody, type = 'fetch', headers) => {
      let response;
      const {
        requestConfig: result,
        params
      } = getFullRequest(requestUrl, requestBody, type, headers);
      if (!params.api) {
        return;
      }
      // @ts-ignore
      const mockResponse = await originalFetch(...(result || {}));
      if (mockResponse && mockResponse.ok) {
        const mockData = await mockResponse.json();
        const {
          succeed,
          data = {}
        } = mockData || {};
        if (succeed) {
          const mockResult = {
            api: params.api,
            data,
            ret: ['SUCCESS::调用成功'],
            traceId: 'mock data',
            v: '1.0'
          };
          if (type === 'fetch') {
            response = new Response(JSON.stringify(mockResult), {
              status: 200,
              statusText: 'OK',
              headers: {
                'Content-Type': 'application/json'
              }
            });
          } else if (type === 'xhr') {
            response = mockResult;
          }
        }
        setMockApis([{
          api: params.api,
          succeed
        }]);
      }
      return response;
    };
    window.fetch = async function (...methodParams) {
      let response;
      try {
        // 2. 判断是否需要mock: 在目标接口中才进行mock

        const {
          requestUrl,
          requestBody,
          headers
        } = parseWrap(methodParams);
        const {
          api
        } = parse(requestUrl, requestBody);
        if (browserMockFlag) {
          if (targetApis.some(i => i !== api) || matchAll) {
            response = await handleFetchDataCenter(requestUrl, requestBody, 'fetch', headers);
          } else {
            response = originalFetch(...methodParams);
          }
        }
      } catch (error) {
        response = originalFetch(...methodParams);
        console.error('Failed to fetch mock data', error);
      }
      return response;
    };
    const _open = window.XMLHttpRequest.prototype.open;
    const _send = window.XMLHttpRequest.prototype.send;
    window.XMLHttpRequest.prototype.send = async function (...sendMethodParams) {
      try {
        const [requestBody] = sendMethodParams;
        const [, requestUrl] = this._methodParams;
        // 判断是否需要 mock: 在目标接口中才进行 mock
        if (browserMockFlag) {
          if (targetApis.some(i => requestUrl.includes(i)) || matchAll) {
            const finnalMockResponse = await handleFetchDataCenter(requestUrl, requestBody, 'xhr', {}).catch(error => {
              console.error('mock ui | Failed to fetch mock data', error);
            });
            if (finnalMockResponse) {
              this.open(this._methodParams[0], xhrMockFailAPI);
              Object.defineProperty(this, 'response', {
                writable: true
              });
              Object.defineProperty(this, 'status', {
                writable: true
              });
              Object.defineProperty(this, 'readyState', {
                writable: true
              });
              Object.defineProperty(this, 'responseText', {
                writable: true
              });
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

var styles = {"title":"style-module_title__04CU7","body":"style-module_body__8uL-5","count":"style-module_count__cBFXn","plus1":"style-module_plus1__fsYU8","mockApiList":"style-module_mockApiList__48OdH","mockApiItem":"style-module_mockApiItem__n2lMS"};
var stylesheet="*,:after,:before{--un-rotate:0;--un-rotate-x:0;--un-rotate-y:0;--un-rotate-z:0;--un-scale-x:1;--un-scale-y:1;--un-scale-z:1;--un-skew-x:0;--un-skew-y:0;--un-translate-x:0;--un-translate-y:0;--un-translate-z:0;--un-pan-x: ;--un-pan-y: ;--un-pinch-zoom: ;--un-scroll-snap-strictness:proximity;--un-ordinal: ;--un-slashed-zero: ;--un-numeric-figure: ;--un-numeric-spacing: ;--un-numeric-fraction: ;--un-border-spacing-x:0;--un-border-spacing-y:0;--un-ring-offset-shadow:0 0 transparent;--un-ring-shadow:0 0 transparent;--un-shadow-inset: ;--un-shadow:0 0 transparent;--un-ring-inset: ;--un-ring-offset-width:0px;--un-ring-offset-color:#fff;--un-ring-width:0px;--un-ring-color:rgba(147,197,253,.5);--un-blur: ;--un-brightness: ;--un-contrast: ;--un-drop-shadow: ;--un-grayscale: ;--un-hue-rotate: ;--un-invert: ;--un-saturate: ;--un-sepia: ;--un-backdrop-blur: ;--un-backdrop-brightness: ;--un-backdrop-contrast: ;--un-backdrop-grayscale: ;--un-backdrop-hue-rotate: ;--un-backdrop-invert: ;--un-backdrop-opacity: ;--un-backdrop-saturate: ;--un-backdrop-sepia: }::backdrop{--un-rotate:0;--un-rotate-x:0;--un-rotate-y:0;--un-rotate-z:0;--un-scale-x:1;--un-scale-y:1;--un-scale-z:1;--un-skew-x:0;--un-skew-y:0;--un-translate-x:0;--un-translate-y:0;--un-translate-z:0;--un-pan-x: ;--un-pan-y: ;--un-pinch-zoom: ;--un-scroll-snap-strictness:proximity;--un-ordinal: ;--un-slashed-zero: ;--un-numeric-figure: ;--un-numeric-spacing: ;--un-numeric-fraction: ;--un-border-spacing-x:0;--un-border-spacing-y:0;--un-ring-offset-shadow:0 0 transparent;--un-ring-shadow:0 0 transparent;--un-shadow-inset: ;--un-shadow:0 0 transparent;--un-ring-inset: ;--un-ring-offset-width:0px;--un-ring-offset-color:#fff;--un-ring-width:0px;--un-ring-color:rgba(147,197,253,.5);--un-blur: ;--un-brightness: ;--un-contrast: ;--un-drop-shadow: ;--un-grayscale: ;--un-hue-rotate: ;--un-invert: ;--un-saturate: ;--un-sepia: ;--un-backdrop-blur: ;--un-backdrop-brightness: ;--un-backdrop-contrast: ;--un-backdrop-grayscale: ;--un-backdrop-hue-rotate: ;--un-backdrop-invert: ;--un-backdrop-opacity: ;--un-backdrop-saturate: ;--un-backdrop-sepia: }.style-module_title__04CU7{margin-bottom:10px;text-align:center}.style-module_body__8uL-5{display:flex;max-width:190px}.style-module_count__cBFXn{--un-text-opacity:1;color:rgb(249 115 22/var(--un-text-opacity))}.style-module_plus1__fsYU8{color:aqua;float:right;margin-left:10px}.style-module_mockApiList__48OdH{display:flex;flex-direction:column}.style-module_mockApiItem__n2lMS{max-width:190px;overflow:scroll;word-break:normal}";

var _tmpl$ = /*#__PURE__*/web.template(`<div>`),
  _tmpl$2 = /*#__PURE__*/web.template(`<div><div>snapshot mock<button>关闭mock</button></div><div>`);
const ssrmockId = getCookie(MOCKCOOKIEKEY);
function Counter() {
  const [getMockApis, setMockApis] = solidJs.createSignal([]);
  test((data = []) => {
    setMockApis(pre => {
      const newResultMap = new Map(pre.map(item => [item.api, item]));
      // 遍历 data 数组
      for (const dataItem of data) {
        if (newResultMap.has(dataItem.api)) {
          // 如果存在，更新 succeed 属性
          newResultMap.get(dataItem.api).succeed = dataItem.succeed;
        } else {
          // 如果不存在，添加新的项
          newResultMap.set(dataItem.api, dataItem);
        }
      }
      // 将 Map 转回数组
      const newResult = Array.from(newResultMap.values());
      return newResult;
    });
  });
  const matchedContentDom = (() => {
    var _el$ = _tmpl$();
    web.insert(_el$, () => getMockApis().filter(item => item.succeed).map(item => {
      return (() => {
        var _el$2 = _tmpl$();
        web.insert(_el$2, () => item.api);
        web.effect(() => web.className(_el$2, styles.mockApiItem));
        return _el$2;
      })();
    }));
    web.effect(() => web.className(_el$, styles.mockApiList));
    return _el$;
  })();
  // const handleMatched = () => {
  //   // @ts-ignore
  //   showToast(matchedContentDom, {
  //     theme: 'dark',
  //   });
  // };
  const handleCloseMock = () => {
    delCookie(MOCKCOOKIEKEY);
    location.reload(); // 刷新页面
  };
  return ssrmockId && (() => {
    var _el$3 = _tmpl$2(),
      _el$4 = _el$3.firstChild,
      _el$5 = _el$4.firstChild,
      _el$6 = _el$5.nextSibling,
      _el$7 = _el$4.nextSibling;
    _el$6.$$click = handleCloseMock;
    web.insert(_el$7, matchedContentDom);
    web.effect(_p$ => {
      var _v$ = styles.container,
        _v$2 = styles.title,
        _v$3 = styles.plus1,
        _v$4 = styles.body;
      _v$ !== _p$.e && web.className(_el$3, _p$.e = _v$);
      _v$2 !== _p$.t && web.className(_el$4, _p$.t = _v$2);
      _v$3 !== _p$.a && web.className(_el$6, _p$.a = _v$3);
      _v$4 !== _p$.o && web.className(_el$7, _p$.o = _v$4);
      return _p$;
    }, {
      e: undefined,
      t: undefined,
      a: undefined,
      o: undefined
    });
    return _el$3;
  })();
}

// Let's create a movable panel using @violentmonkey/ui
const panel = ui.getPanel({
  theme: 'dark',
  style: [stylesheet].join('\n')
});
Object.assign(panel.wrapper.style, {
  right: '3vw',
  bottom: '10vw'
});
// 只有在mock的时候才显示页面控制
if (ssrmockId) {
  panel.setMovable(true);
  panel.show();
  web.render(Counter, panel.body);
}
web.delegateEvents(["click"]);

})(VM.solid.web, VM.solid, VM);
