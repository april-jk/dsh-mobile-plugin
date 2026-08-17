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

推荐通过不可变的 GitHub Tag 公开安装。该方式不要求全局安装 DSH，也不需要本地插件目录：

```bash
npx @deepseek-ai/dsh plugin --profile web add "github:april-jk/dsh-mobile-plugin#v0.1.3"
npx @deepseek-ai/dsh web
```

每个 GitHub Release 也包含预构建 `.tgz`。DSH 可以直接从 Release URL 安装，不需要手动下载或填写本地路径：

```bash
npx @deepseek-ai/dsh plugin --profile web add "https://github.com/april-jk/dsh-mobile-plugin/releases/download/v0.1.3/april-jk-dsh-mobile-0.1.3.tgz"
npx @deepseek-ai/dsh web
```

包元数据已经为 npm 准备好，但 `@april-jk/dsh-mobile` 目前尚未发布到公共 npm Registry。完成首次 npm 发布后，安装命令将是：

```bash
npx @deepseek-ai/dsh plugin --profile web add "@april-jk/dsh-mobile@<published-version>"
npx @deepseek-ai/dsh web
```

卸载命令：

```bash
npx @deepseek-ai/dsh plugin --profile web remove @april-jk/dsh-mobile
```

本地开发时，克隆仓库并让 Shell 自动传入当前目录：

```bash
git clone https://github.com/april-jk/dsh-mobile-plugin.git
cd dsh-mobile-plugin
npm ci
npm run build
npx @deepseek-ai/dsh plugin --profile web add "$PWD"
npx @deepseek-ai/dsh web
```

## 配对手机

在本机 DSH Web UI 中打开 **Settings > Remote Access**，使用移动应用扫描 v2 二维码。二维码同时传递一次性配对信息和端到端加密密钥；在 0.1.3 版本中，仅输入六位配对码不足以完成安全配对。后续启动 DSH 时，会复用保存在 `~/.dsh-remote/config.json` 中的设备凭据；该文件仅允许当前用户读取。

同一设置页可以移除配对。移除操作会撤销 Relay 设备凭据、断开正在进行的远程访问，并且只在 Relay 确认后清除本地凭据。Web UI 不可用时，可以执行 `dsh-mobile unpair` 完成相同操作。

## 网络和数据行为

- DSH 始终监听 `127.0.0.1:3080`；插件不会创建公网监听端口。
- 电脑默认向 `https://relay.dshmobile.online` 建立出站 WSS 连接。启动 DSH 前设置 `DSH_RELAY` 可以使用其他兼容 Relay。
- HTTP、SSE 和 WebSocket 载荷由移动应用和本 Companion 使用 AES-256-GCM 进行端到端加密。Relay 只转发密封帧，TLS 额外保护传输中的连接元数据。
- 0.1.3 使用二维码预置的共享密钥，不提供前向保密。如果二维码或任一端点可能泄露，请解除配对后重新配对。
- 插件将 Relay 设备 Token 保存在本机 `~/.dsh-remote/config.json`，不会把该 Token 发送给移动端。
- Relay 为访问时间线记录受限的手机元数据和访问时间，但不会持久化 DSH 请求体或响应体。
- 安装本 Bundle 后会禁用 DSH 原生目录选择器，改用浏览器目录选择器，使远程浏览器无需打开 Finder 或其他原生对话框即可选择目录。

使用私有 Relay 时，电脑端必须指向移动应用中配置的同一 HTTPS Origin：

```bash
DSH_RELAY=https://relay.example.com npx @deepseek-ai/dsh web
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

仓库有意提交 `dist/`，确保从 GitHub 安装时无需执行生命周期脚本即可获得完整插件。CI 会在 Node.js 18、20 和 22 上执行构建、测试、产物新鲜度检查及 npm 打包检查，并针对固定版本的 DSH Developer Preview 验证安装兼容性。

发布时需要同步更新 `package.json` 与 `package-lock.json`、重新构建 `dist/`，然后推送与 `v<package.version>` 完全一致的 Tag。Tag 工作流会重复所有发布检查，再创建或更新 GitHub Release 并上传预构建 npm tarball。Tag 与包版本不一致时，会在上传任何产物前失败。

npm 发布默认关闭。仓库维护者可以将 Actions 变量 `NPM_PUBLISH_ENABLED` 设置为 `true`，并添加拥有 `@april-jk/dsh-mobile` 发布权限的 `NPM_TOKEN` Actions Secret 来显式启用。缺少任一设置时，GitHub Release 仍会正常发布，工作流不会尝试 npm 发布。

## 社区发现

仓库应设置 `dsh-plugin` 和 `deepseek-harness` GitHub Topic。在官方插件 Discussion 分类中，一个项目单独发布一篇帖子，标题可使用：

`DSH | DSH Mobile Remote | Access your local DSH Web UI from a paired phone`

可直接发布的项目介绍维护在 [`docs/SHOW-YOUR-PLUGIN.md`](docs/SHOW-YOUR-PLUGIN.md)。

## 许可证

[MIT](LICENSE)
