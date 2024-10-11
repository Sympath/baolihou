import { createSignal } from 'solid-js';
import { render } from 'solid-js/web';
import test from './intercept';
import { getPanel } from '@violentmonkey/ui';
// global CSS
// import globalCss from './style.css';
// CSS modules
import styles, { stylesheet } from './style.module.css';
import { delCookie, getCookie } from './utils';
import { MOCKCOOKIEKEY } from './utils/constance';
const ssrmockId = getCookie(MOCKCOOKIEKEY);
function Counter() {
  const [getMockApis, setMockApis] = createSignal([]);
  test((data = []) => {
    setMockApis(
      Array.from(
        new Map(
          [...getMockApis(), ...data].map((item) => [item.id, item]),
        ).values(),
      ),
    );
  });
  const matchedContentDom = (
    <div class={styles.mockApiList}>
      {getMockApis()
        .filter((item) => item.succeed)
        .map((item) => {
          return <div class={styles.mockApiItem}>{item.api}</div>;
        })}
    </div>
  );
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

  return (
    <>
      {ssrmockId && (
        <div class={styles.container}>
          <div class={styles.title}>
            snapshot mock
            <button class={styles.plus1} onClick={handleCloseMock}>
              关闭mock
            </button>
          </div>
          <div class={styles.body}>{matchedContentDom}</div>
        </div>
      )}
    </>
  );
}

// Let's create a movable panel using @violentmonkey/ui
const panel = getPanel({
  theme: 'dark',
  style: [stylesheet].join('\n'),
});
Object.assign(panel.wrapper.style, {
  right: '3vw',
  bottom: '10vw',
});
// 只有在mock的时候才显示页面控制
if (ssrmockId) {
  panel.setMovable(true);
  panel.show();
  render(Counter, panel.body);
}
