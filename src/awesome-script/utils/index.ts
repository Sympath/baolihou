// 读取cookies
export function getCookie(name) {
  if (document && document.cookie) {
    let arr;
    const reg = new RegExp('(^| )' + name + '=([^;]*)(;|$)');

    if ((arr = document.cookie.match(reg))) return unescape(arr[2]);
    else return null;
  }
}
export function delCookie(name) {
  if (document && document.cookie) {
    const exp = new Date();
    exp.setTime(exp.getTime() - 1);
    const cval = getCookie(name);
    if (cval != null)
      // @ts-ignore
      document.cookie =
        name +
        '=' +
        cval +
        ';path=/;domain=.taobao.com;expires=' +
        // @ts-ignore
        exp.toGMTString();
  }
}
