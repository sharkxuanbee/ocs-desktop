# OCS Desktop Linux 构建配置方案

## 概述

本文档说明 OCS Desktop 在 Linux 平台的构建配置，包括 AppImage 打包配置、数据存储配置以及相关构建流程。

## 构建配置文件

### 1. electron-builder 配置

**文件位置**: `packages/app/electron.builder.json`

**Linux 配置**:

```json
{
  "linux": {
    "icon": "public/favicon.png",
    "artifactName": "ocs-${version}-setup-${os}-${arch}.${ext}",
    "target": [
      {
        "target": "AppImage"
      }
    ],
    "extraResources": [
      {
        "from": "../../bin/",
        "to": "bin",
        "filter": ["**/*.zip"]
      }
    ]
  }
}
```

**配置说明**:
- `target`: 仅配置 `AppImage` 目标，不生成 deb/rpm 包
- `artifactName`: 使用统一的命名格式
- `extraResources`: 将二进制文件打包到 AppImage 中

### 2. GitHub Actions 工作流配置

**文件位置**: `.github/workflows/build.yml`

**关键配置**:

```yaml
# Linux 构建矩阵
- os: ubuntu-latest
  platform: linux
  arch: x64
- os: ubuntu-22.04-arm
  platform: linux
  arch: arm64

# 上传配置（仅包含 AppImage）
- name: Upload Release
  uses: softprops/action-gh-release@v2
  with:
    body_path: "./release.txt"
    files: "./packages/app/dist/**.exe,./packages/app/dist/**.dmg,./packages/app/dist/**.AppImage,./packages/app/dist/**.zip"

# 腾讯云上传配置
- name: 上传到腾讯云 COS
  run: |
    coscmd upload -r packages/app/dist/ /app/download/${{ env.VERSION }}/  --include *.zip,*.exe,*.dmg,*.AppImage  --ignore  "**/*/chrome.zip"
```

**配置说明**:
- 支持 x64 和 ARM64 架构
- 仅上传 AppImage 格式文件
- 排除内部的 chrome.zip 文件

### 3. 发布说明模板

**文件位置**: 在构建过程中动态生成 `release.txt`

**Linux 下载链接**:

```markdown
### Linux
- [AppImage](${{ env.DOWNLOAD_URL }}ocs-${{ env.VERSION }}-setup-linux-x86_64.AppImage) | [ARM64 AppImage](${{ env.DOWNLOAD_URL }}ocs-${{ env.VERSION }}-setup-linux-arm64.AppImage)
```

## 数据存储配置

### 1. 核心路径配置

**文件位置**: `packages/app/src/store.ts`

**路径获取函数**:

```typescript
function getAppDataPath() {
  if (process.platform === 'linux') {
    const appImagePath = process.env.APPIMAGE;
    if (appImagePath) {
      const appDir = path.dirname(appImagePath);
      const dataDir = path.join(appDir, 'ocs-data');
      if (!existsSync(dataDir)) {
        mkdirSync(dataDir, { recursive: true });
      }
      return dataDir;
    }
  }
  return app.getPath('userData');
}
```

**配置说明**:
- 检测 `APPIMAGE` 环境变量
- 在 AppImage 所在目录创建 `ocs-data` 文件夹
- 其他平台使用系统标准路径

### 2. 路径配置结构

**配置对象**:

```typescript
export const OriginalAppStore = {
  name: app.getName(),
  version: app.getVersion(),
  paths: {
    'app-path': app.getAppPath(),
    'user-data-path': appDataPath,
    'exe-path': app.getPath('exe'),
    'logs-path': path.join(appDataPath, 'logs'),
    'config-path': path.join(appDataPath, 'config.json'),
    userDataDirsFolder: '',
    downloadFolder: path.join(appDataPath, 'downloads'),
    extensionsFolder: path.join(appDataPath, 'downloads', 'extensions')
  },
  // ... 其他配置
};
```

### 3. 初始化配置

**文件位置**: `packages/app/src/tasks/init.store.ts`

**初始化流程**:

```typescript
export function initStore() {
  // 版本检查和配置更新
  const version = store.store.version;
  
  // 浏览器数据目录初始化
  if (!store.store.paths.userDataDirsFolder) {
    OriginalAppStore.paths.userDataDirsFolder = path.join(appDataPath, 'userDataDirs');
  } else {
    OriginalAppStore.paths.userDataDirsFolder = store.store.paths.userDataDirsFolder;
  }

  // 强制更新路径
  store.set('paths', OriginalAppStore.paths);

  // 创建必要的目录
  if (!existsSync(store.store.paths.userDataDirsFolder)) {
    mkdirSync(store.store.paths.userDataDirsFolder, { recursive: true });
  }
  if (!existsSync(store.store.paths.extensionsFolder)) {
    mkdirSync(store.store.paths.extensionsFolder, { recursive: true });
  }
  if (!existsSync(store.store.paths.downloadFolder)) {
    mkdirSync(store.store.paths.downloadFolder, { recursive: true });
  }
}
```

### 4. 日志配置

**文件位置**: `packages/app/src/logger.ts`

**日志路径配置**:

```typescript
export function Logger(...name: any[]) {
  return new LoggerCore(path.join(appDataPath, 'logs'), true, ...name);
}
```

## 构建流程

### 1. 本地构建

**命令**:

```bash
# 完整构建
npm run build

# 仅构建应用
cd packages/app
npm run dist

# 开发模式
npm run dev
```

**构建步骤**:

1. TypeScript 编译
2. Web 前端构建
3. Chrome 浏览器安装
4. Electron 打包
5. 资源压缩

### 2. 发布流程

**脚本位置**: `scripts/release.sh`

**发布步骤**:

```bash
# 1. 代码检查
npm run lint

# 2. 更新版本号
npm version "$version" --no-git-tag-version --allow-same-version
cd ./packages/app
npm version "$version" --no-git-tag-version --allow-same-version
cd ../../

# 3. 本地构建
npm run build

# 4. 更新日志
npm run changelog
npm run changelog:current

# 5. Git 提交和标签
git add ./packages/app/package.json package.json CHANGELOG.md CHANGELOG_CURRENT.md
git commit -m "version release $version"
git tag "$version"
git push origin main --tags
```

### 3. CI/CD 构建

**GitHub Actions 触发条件**:

```yaml
on:
  push:
    tags:
      - "*"
  workflow_dispatch:
```

**构建环境**:

| 平台 | 操作系统 | 架构 | Node.js 版本 |
|-----|---------|------|-------------|
| Windows | windows-latest | x64 | 22.14 |
| macOS | macos-13 | x64 | 22.14 |
| macOS | macos-latest | arm64 | 22.14 |
| Linux | ubuntu-latest | x64 | 22.14 |
| Linux | ubuntu-22.04-arm | arm64 | 22.14 |

## 打包输出

### 1. 输出文件

**Linux 输出**:

```
packages/app/dist/
├── ocs-2.9.31-setup-linux-x86_64.AppImage
├── ocs-2.9.31-setup-linux-arm64.AppImage
└── app2.9.31.zip
```

### 2. 文件命名规则

**AppImage 文件**: `ocs-${version}-setup-${os}-${arch}.AppImage`

示例:
- `ocs-2.9.31-setup-linux-x86_64.AppImage`
- `ocs-2.9.31-setup-linux-arm64.AppImage`

### 3. 资源包

**app2.9.31.zip**: 包含应用程序资源，用于更新和分发

## 部署说明

### 1. 本地部署

**步骤**:

1. 下载 AppImage 文件
2. 添加执行权限:

```bash
chmod +x ocs-2.9.31-setup-linux-x86_64.AppImage
```

3. 运行应用程序:

```bash
./ocs-2.9.31-setup-linux-x86_64.AppImage
```

### 2. 数据目录创建

首次运行时，应用程序会自动:

1. 检测 AppImage 所在目录
2. 创建 `ocs-data` 文件夹
3. 初始化子目录结构
4. 创建配置文件

### 3. 桌面集成（可选）

**创建桌面快捷方式**:

```bash
# 创建 .desktop 文件
cat > ~/.local/share/applications/ocs-desktop.desktop << EOF
[Desktop Entry]
Name=OCS Desktop
Comment=OCS 浏览器自动化神器
Exec=/path/to/ocs-2.9.31-setup-linux-x86_64.AppImage
Icon=/path/to/icon.png
Terminal=false
Type=Application
Categories=Utility;
EOF

# 使快捷方式可执行
chmod +x ~/.local/share/applications/ocs-desktop.desktop
```

## 配置验证

### 1. 验证 AppImage

```bash
# 检查文件权限
ls -l ocs-2.9.31-setup-linux-x86_64.AppImage

# 检查文件类型
file ocs-2.9.31-setup-linux-x86_64.AppImage

# 验证签名（如果有）
unsquashfs -o 0 -d /tmp/verify ocs-2.9.31-setup-linux-x86_64.AppImage
```

### 2. 验证数据目录

```bash
# 检查数据目录结构
ls -la ocs-data/

# 检查配置文件
cat ocs-data/config.json

# 检查日志
ls -la ocs-data/logs/
```

### 3. 验证路径配置

在应用程序中检查:

```typescript
console.log('User Data Path:', store.store.paths['user-data-path']);
console.log('Logs Path:', store.store.paths['logs-path']);
console.log('Download Folder:', store.store.paths.downloadFolder);
```

## 故障排除

### 1. 构建问题

**问题**: AppImage 构建失败

**解决方案**:
- 检查 Node.js 版本是否为 22.14
- 确认 electron-builder 配置正确
- 检查磁盘空间是否充足

**问题**: 数据目录未创建

**解决方案**:
- 检查 AppImage 所在目录的写权限
- 验证 `APPIMAGE` 环境变量
- 手动创建 `ocs-data` 目录

### 2. 运行问题

**问题**: 应用程序无法启动

**解决方案**:
```bash
# 检查依赖
ldd ocs-2.9.31-setup-linux-x86_64.AppImage

# 检查权限
chmod +x ocs-2.9.31-setup-linux-x86_64.AppImage

# 查看错误信息
./ocs-2.9.31-setup-linux-x86_64.AppImage --verbose
```

**问题**: 数据路径错误

**解决方案**:
- 检查 `APPIMAGE` 环境变量
- 验证配置文件中的路径
- 删除配置文件，重新初始化

### 3. 权限问题

**问题**: 无法写入数据目录

**解决方案**:
```bash
# 修复目录权限
chmod -R 755 ocs-data/

# 修复文件权限
chmod 644 ocs-data/config.json

# 修复浏览器数据权限
chmod -R 700 ocs-data/userDataDirs/
```

## 性能优化

### 1. 构建优化

**减少构建时间**:
- 使用缓存依赖
- 并行构建任务
- 增量编译

**减小包体积**:
- 排除不必要的文件
- 压缩资源
- 使用 asar 打包

### 2. 运行时优化

**数据访问优化**:
- 使用内存缓存
- 异步 I/O 操作
- 批量处理文件

**日志优化**:
- 日志级别控制
- 定期清理旧日志
- 压缩归档日志

## 安全配置

### 1. 数据加密

应用程序支持数据加密功能:

```typescript
// 启用数据加密
store.set('app.data_encryption', true);
```

### 2. 权限控制

确保敏感数据目录权限正确:

```bash
# 浏览器数据目录（仅用户可访问）
chmod 700 ocs-data/userDataDirs/

# 配置文件（用户可读写）
chmod 644 ocs-data/config.json
```

### 3. 签名验证

建议对 AppImage 进行签名:

```bash
# 使用 AppImageTool 签名
appimagetool --sign ocs-2.9.31-setup-linux-x86_64.AppImage
```

## 更新和维护

### 1. 版本更新流程

1. 更新版本号
2. 运行构建
3. 测试新版本
4. 发布到 GitHub
5. 上传到腾讯云 COS

### 2. 数据迁移

提供数据迁移工具:

```typescript
// 检测旧数据
const oldDataPath = path.join(os.homedir(), '.config', 'ocs-desktop');

// 迁移数据
if (existsSync(oldDataPath)) {
  // 提示用户迁移
  // 复制数据到新位置
  // 更新配置
}
```

### 3. 清理旧版本

定期清理旧版本文件:

```bash
# 删除旧版本 AppImage
rm ocs-2.9.30-setup-linux-x86_64.AppImage

# 清理旧日志
find ocs-data/logs -type d -mtime +30 -exec rm -rf {} +
```

## 附录

### A. 环境变量

| 变量名 | 用途 | 默认值 |
|-------|------|--------|
| `APPIMAGE` | AppImage 文件路径 | 自动设置 |
| `USE_HARD_LINKS` | 构建时使用硬链接 | false |

### B. 构建命令速查

```bash
# 本地构建
npm run build

# 发布版本
npm run release

# 类型检查
npm run tsc

# 代码检查
npm run lint

# 代码格式化
npm run format
```

### C. 目录结构速查

```
ocs-desktop-1/
├── packages/
│   └── app/
│       ├── electron.builder.json  # 构建配置
│       ├── src/
│       │   ├── store.ts          # 数据存储配置
│       │   ├── logger.ts         # 日志配置
│       │   └── tasks/
│       │       └── init.store.ts # 初始化配置
│       └── dist/                 # 构建输出
├── scripts/
│   ├── build-app.js              # 构建脚本
│   └── release.sh                # 发布脚本
├── .github/
│   └── workflows/
│       └── build.yml             # CI/CD 配置
└── docs/
    └── linux-data-storage-structure.md  # 数据存储文档
```

---

**文档版本**: 1.0  
**最后更新**: 2026-02-03  
**适用版本**: OCS Desktop 2.9.31+  
**平台**: Linux (AppImage)