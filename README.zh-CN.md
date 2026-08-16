# DSH Mobile Remote

[English](README.md) | [简体中文](README.zh-CN.md)

通过只建立出站连接的 Relay，让已配对手机远程访问电脑本地的 DeepSeek Harness Web UI。

> **非官方社区项目：** 本项目由社区独立开发和维护，未经 DeepSeek 审核、推荐或支持。

**完整项目、已签名 Android APK 和 Relay 私有部署包：** [DSH Mobile Suite](https://github.com/april-jk/dsh-mobile-suite)

![DeepSeek Harness 中的 DSH Mobile Remote 设置页](docs/images/remote-access-settings.png)

## 兼容性

当前版本已针对 `@deepseek-ai/dsh@0.1.0-rc.6` 完成测试。DeepSeek Harness 仍处于 Developer Preview，可能引入破坏性插件变更。CI 固定该版本，以便明确发现兼容性变化。

环境要求：

- Node.js 18 或更高版本
- DeepSeek Harness `0.1.0-rc.6`
- 一台安装 DSH Mobile 应用的手机
- 能够通过 HTTPS 访问所配置的 Relay

## 安装

推荐通过不可变的 GitHub Tag 公开安装：

```bash
dsh plugin --profile web add github:april-jk/dsh-mobile-plugin#v0.1.2
dsh web
```

每个 GitHub Release 也包含预构建 `.tgz`，无需运行源码构建即可下载并安装：

```bash
dsh plugin --profile web add ./april-jk-dsh-mobile-0.1.2.tgz
dsh web
```

公开 npm 包可用后，对应的 Registry 安装命令是：

```bash
dsh plugin --profile web add @april-jk/dsh-mobile@0.1.2
dsh web
```

卸载命令：

```bash
dsh plugin --profile web remove @april-jk/dsh-mobile
```

本地开发安装：

```bash
npm ci
npm run build
dsh plugin --profile web add "/absolute/path/to/dsh-mobile-plugin"
dsh web
```

## 配对手机

在本机 DSH Web UI 中打开 **Settings > Remote Access**，生成六位配对码或二维码。登录移动应用并认领一次即可。后续启动 DSH 时，会复用保存在 `~/.dsh-remote/config.json` 中的设备凭据；该文件仅允许当前用户读取。

同一设置页可以移除配对。移除操作会撤销 Relay 设备凭据、断开正在进行的远程访问，并且只在 Relay 确认后清除本地凭据。Web UI 不可用时，可以执行 `dsh-mobile unpair` 完成相同操作。

## 网络和数据行为

- DSH 始终监听 `127.0.0.1:3080`；插件不会创建公网监听端口。
- 电脑默认向 `https://relay.dshmobile.online` 建立出站 WSS 连接。启动 DSH 前设置 `DSH_RELAY` 可以使用其他兼容 Relay。
- Relay 转发经过鉴权的 HTTP 和 WebSocket 流量。MVP 流量受 TLS 保护，但还没有应用层端到端加密。
- 插件将 Relay 设备 Token 保存在本机 `~/.dsh-remote/config.json`，不会把该 Token 发送给移动端。
- Relay 为访问时间线记录受限的手机元数据和访问时间，但不会持久化 DSH 请求体或响应体。
- 安装本 Bundle 后会禁用 DSH 原生目录选择器，改用浏览器目录选择器，使远程浏览器无需打开 Finder 或其他原生对话框即可选择目录。

使用私有 Relay 时，电脑端必须指向移动应用中配置的同一 HTTPS Origin：

```bash
DSH_RELAY=https://relay.example.com dsh web
```

## 独立命令

后备 CLI 安装为 `dsh-mobile`，支持 `start`、`pair`、`status` 和 `unpair`。普通用户应优先通过 DSH 设置页管理配对。

## 开发

```bash
npm ci
npm run build
npm test
npm pack --dry-run
```

仓库有意提交 `dist/`，确保从 GitHub 安装时无需执行生命周期脚本即可获得完整插件。CI 会重新构建并拒绝过期的生成文件。推送匹配 `v*` 的 Tag 会创建包含预构建 npm tarball 的 GitHub Release。

## 社区发现

仓库应设置 `dsh-plugin` 和 `deepseek-harness` GitHub Topic。在官方插件 Discussion 分类中，一个项目单独发布一篇帖子，标题可使用：

`DSH | DSH Mobile Remote | Access your local DSH Web UI from a paired phone`

可直接发布的项目介绍维护在 [`docs/SHOW-YOUR-PLUGIN.md`](docs/SHOW-YOUR-PLUGIN.md)。

## 许可证

[MIT](LICENSE)
