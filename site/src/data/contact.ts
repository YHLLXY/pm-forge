/**
 * 联系方式的唯一来源：首页 §06 联系区的轨道节点与弹层都读这里。
 *
 * 为什么不塞进 astro-paper.config 的 socials：socials 会进 JSON-LD 的 sameAs，
 * 而 schema.org 的 sameAs 只接受可访问的 URL —— 放 mailto: 或二维码路径进去
 * 会让 check-ld 报错（门禁是对的，不改门禁）。
 *
 * 小红书没有加：没有可核验的主页链接，编一个等于在面试材料里放假链接。
 * 如果哪天给了主页地址，这里加一条、组件里加一个节点即可。
 */
export const contact = {
  email: "3244780834@qq.com",
  qq: "3244780834",
  github: "https://github.com/YHLLXY",
  githubName: "YHLLXY",
  wechatQr: "/contact/wechat-qr.png",
  qqQr: "/contact/qq-qr.png",
} as const;
