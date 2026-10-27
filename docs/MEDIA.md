# 素材留白与上传说明

## 在网页里试放素材

1. 打开游戏顶部“素材馆”，选择介绍或某个生命阶段；也可从阶段指南找到对应位置。
2. 展开卡片的“上传说明与署名”，填写拍摄情境、日龄、作者与来源等信息。
3. 点击“上传素材”，选择图片、声音或视频。替换素材时同样先修改说明，再选择新文件。
4. 素材保存到当前浏览器，刷新后可继续查看。音频和视频使用原生播放控件，不自动播放。
5. “移除本机素材”仅移除该位置的本地覆盖，有公开素材时会恢复显示公开版本。

**网页上传不会提交 GitHub，也不会让其他人看见。**这是浏览器内试放功能，不是假装存在的上传服务器。浏览器清除数据、无痕会话或存储权限限制都可能导致本机素材无法保留，请保管原文件。

- 单文件上限 25 MB，本机库总量上限 100 MB。
- 图片：PNG、JPEG、WebP、GIF；不接收 SVG 或网页文件。
- 声音：MP3、WAV、OGG、M4A、WebM 音频。
- 视频：MP4、WebM、OGG 视频。
- MIME 类型与文件头均检查；通过检查不保证浏览器支持文件内的所有编码，无法解码会给出提示。
- 说明与署名是用户填写的元数据，不会自动鉴定物种、性别、日龄或授权。

## 让所有玩家看见素材

将可公开使用的文件加入 public/media/，再编辑 public/media/manifest.json。示例（需换成真实存在且有权使用的文件）：

```json
{
  "intro-female": {
    "src": "media/female.jpg",
    "kind": "image",
    "caption": "雌鸟；性别确认方式与拍摄情境",
    "credit": "作者 / 来源 / 使用许可"
  },
  "courtship-call": {
    "src": "media/call.mp3",
    "kind": "audio",
    "caption": "地点概述、日期及实际行为情境",
    "credit": "录音者 / 使用许可"
  },
  "flight-preparation": {
    "src": "media/preparation.mp4",
    "kind": "video",
    "caption": "幼鸟准备与离巢的连续记录",
    "credit": "摄像者 / 使用许可"
  }
}
```

- src 必须是站内 media/ 相对路径，不接受外站地址或路径跳转。
- kind 只能是 image、audio 或 video。
- 推送 main 后 GitHub Actions 会重新构建、发布，文件随静态网站公开。
- 当前 manifest.json 为空，所有展示位置有意留白，没有下载未经授权的图片或录音。
- 本机上传覆盖同位置的公开素材；移除本机覆盖后才能看到对应公开版本。
- 不建议直接提交大体积原始视频；先准备适合网页播放的版本。网页本地上传的大小限制不会自动压缩仓库文件。

## 位置清单

| 阶段 | ID | 用途 |
|---|---|---|
| 介绍 | intro-female | 经确认性别的雌鸟外形 |
| 介绍 | intro-male | 经确认性别的雄鸟外形 |
| 介绍 | intro-form | 羽色、翼形、尾形与体态 |
| 介绍 | intro-habitat | 巢居环境、食物链 |
| 介绍 | intro-art | 燕形艺术与文化表现 |
| 求偶 | courtship-call | 叫声与行为情境 |
| 求偶 | courtship-display | 经确认的配对或求偶动作 |
| 筑巢 | nest-site | 巢址条件对照 |
| 筑巢 | nest-build | 巢形、巢材与整理 |
| 孵化 | incubation-eggs | 卵与巢内位置 |
| 孵化 | incubation-care | 孵卵与亲鸟轮换 |
| 养育 | young-newborn | 初孵外形 |
| 养育 | young-growing | 羽毛生长与能力变化 |
| 养育 | young-fledging | 离巢前体态 |
| 养育 | young-feeding | 喂食与粪囊处理录像 |
| 飞行 | flight-preparation | 起飞前准备 |
| 飞行 | flight-silhouette | 初飞与捕虫 |
| 迁徙 | migration-route | 南迁地图与景观 |
| 迁徙 | migration-flock | 迁途中群鸟行为 |
| 回家 | home-route | 北返路线 |
| 回家 | home-nest | 跨年巢址变化 |

## 数据存储与隐私范围

素材单独保存在 if-i-were-a-bird-media 数据库的 assets 仓库。重新开始剧情只更新游戏进度，不删除素材。预览使用临时 Blob URL，重新渲染时释放。本站没有上传后端和素材云同步。
