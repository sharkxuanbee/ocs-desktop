# OCS Desktop Linux 数据存储结构说明文档

## 概述

本文档详细说明 OCS Desktop 在 Linux 平台（AppImage 格式）下的数据存储架构。所有应用程序数据统一存放在与 AppImage 包相同的文件夹内，便于管理和迁移。

## 目录结构

```
AppImage包所在目录/
├── OCS-Desktop-*.AppImage          # 应用程序主文件
└── ocs-data/                       # 应用数据根目录（自动创建）
    ├── config.json                 # 应用配置文件
    ├── logs/                       # 日志文件目录
    │   └── YYYY-MM-DD/             # 按日期分类的日志
    │       ├── app.log             # 应用主日志
    │       ├── store-init.log      # 存储初始化日志
    │       ├── task.log            # 任务日志
    │       └── utils.log           # 工具日志
    ├── downloads/                  # 下载文件目录
    │   ├── extensions/             # 浏览器扩展
    │   │   ├── *.crx              # Chrome 扩展文件
    │   │   └── *.zip              # 扩展压缩包
    │   └── [其他下载文件]         # 用户下载的其他文件
    └── userDataDirs/              # 浏览器用户数据目录
        ├── browser-001/           # 浏览器实例1的用户数据
        ├── browser-002/           # 浏览器实例2的用户数据
        └── [更多浏览器实例]       # 根据用户创建的实例数量
```

## 数据分类说明

### 1. 配置数据 (config.json)

**位置**: `ocs-data/config.json`

**用途**: 存储应用程序的全局配置信息

**包含内容**:
- 应用名称和版本信息
- 软件设置（视频帧率、数据加密等）
- 窗口设置（置顶、开机自启等）
- 本地服务器配置（端口、认证令牌）
- 所有路径配置
- 渲染进程数据（加密存储）

**命名规则**: `config.json`（固定文件名）

---

### 2. 日志数据 (logs/)

**位置**: `ocs-data/logs/`

**用途**: 存储应用程序运行时产生的日志文件

**目录结构**:
```
logs/
└── YYYY-MM-DD/                    # 按日期自动创建子目录
    ├── app.log                    # 应用主日志
    ├── store-init.log             # 存储初始化日志
    ├── task.log                   # 任务执行日志
    ├── utils.log                  # 工具函数日志
    └── [其他模块日志]              # 根据应用模块动态创建
```

**命名规则**:
- 日志目录: `YYYY-MM-DD` 格式（例如: `2026-02-03`）
- 日志文件: `[模块名称].log` 格式（例如: `app.log`, `task.log`）

**特点**:
- 按日期自动分类，便于查找和管理
- 支持多级子目录结构
- 自动创建，无需手动干预

---

### 3. 下载文件 (downloads/)

**位置**: `ocs-data/downloads/`

**用途**: 存储应用程序下载的所有文件

**子目录结构**:
```
downloads/
├── extensions/                    # 浏览器扩展专用目录
│   ├── [扩展名称].crx            # Chrome 扩展文件
│   └── [扩展名称].zip            # 扩展压缩包
└── [其他下载文件]                # 用户下载的其他类型文件
```

**命名规则**:
- 扩展目录: `extensions`（固定目录名）
- 扩展文件: 保持原始文件名，或使用 `[扩展名称].[扩展名]` 格式
- 其他文件: 保持原始文件名

**包含内容**:
- 浏览器扩展（.crx, .zip）
- 用户脚本相关文件
- 其他应用程序下载的资源

---

### 4. 浏览器用户数据 (userDataDirs/)

**位置**: `ocs-data/userDataDirs/`

**用途**: 存储每个浏览器实例的用户数据

**目录结构**:
```
userDataDirs/
├── browser-001/                   # 浏览器实例1
│   ├── Default/                  # 默认配置文件
│   ├── Preferences               # 浏览器偏好设置
│   ├── Cookies                   # Cookie 数据
│   ├── History                   # 浏览历史
│   ├── Local Storage/            # 本地存储
│   ├── IndexedDB/                # IndexedDB 数据库
│   ├── Cache/                    # 缓存文件
│   └── [其他浏览器数据]           # Chrome/Chromium 标准数据结构
├── browser-002/                   # 浏览器实例2
│   └── [相同结构]                 # 与实例1相同的目录结构
└── [更多实例]                     # 根据用户创建的数量动态增加
```

**命名规则**:
- 实例目录: `browser-[序号]` 格式（例如: `browser-001`, `browser-002`）
- 序号从 001 开始，自动递增
- 每个实例内部使用 Chrome/Chromium 标准目录结构

**包含内容**:
- 浏览器配置文件
- Cookie 和会话数据
- 浏览历史记录
- 本地存储和 IndexedDB
- 缓存文件
- 扩展数据
- 下载历史

---

## 路径配置

### 应用路径配置

在 `config.json` 中存储的路径配置：

```json
{
  "paths": {
    "app-path": "/path/to/OCS-Desktop.AppImage",
    "user-data-path": "/path/to/ocs-data",
    "exe-path": "/path/to/OCS-Desktop.AppImage",
    "logs-path": "/path/to/ocs-data/logs",
    "config-path": "/path/to/ocs-data/config.json",
    "userDataDirsFolder": "/path/to/ocs-data/userDataDirs",
    "downloadFolder": "/path/to/ocs-data/downloads",
    "extensionsFolder": "/path/to/ocs-data/downloads/extensions"
  }
}
```

### 路径获取逻辑

应用程序通过以下逻辑确定数据存储路径：

1. **Linux 平台**:
   - 检测 `APPIMAGE` 环境变量
   - 如果存在，使用 AppImage 文件所在目录
   - 在该目录下创建 `ocs-data` 文件夹
   - 所有数据存储在 `ocs-data` 目录下

2. **其他平台**:
   - 使用系统标准用户数据目录
   - Windows: `%APPDATA%/OCS Desktop`
   - macOS: `~/Library/Application Support/OCS Desktop`

---

## 文件和文件夹命名规则

### 目录命名规则

| 目录类型 | 命名规则 | 示例 |
|---------|---------|------|
| 数据根目录 | `ocs-data` | `ocs-data` |
| 日志日期目录 | `YYYY-MM-DD` | `2026-02-03` |
| 浏览器实例目录 | `browser-[序号]` | `browser-001`, `browser-002` |
| 扩展目录 | `extensions` | `extensions` |

### 文件命名规则

| 文件类型 | 命名规则 | 示例 |
|---------|---------|------|
| 配置文件 | `config.json` | `config.json` |
| 日志文件 | `[模块名].log` | `app.log`, `task.log` |
| 扩展文件 | `[扩展名].[扩展后缀]` | `adblock.crx`, `extension.zip` |

### 序号规则

- 浏览器实例序号使用 3 位数字，从 001 开始
- 自动递增，不跳号
- 删除实例后，序号不重用

---

## 数据初始化流程

### 首次启动

1. 检测 AppImage 路径
2. 创建 `ocs-data` 目录
3. 创建子目录结构:
   - `logs/`
   - `downloads/`
   - `downloads/extensions/`
   - `userDataDirs/`
4. 创建默认配置文件 `config.json`
5. 初始化日志系统

### 后续启动

1. 检查数据目录是否存在
2. 验证配置文件完整性
3. 加载配置数据
4. 初始化日志系统
5. 检查并创建必要的子目录

---

## 数据迁移

### 从旧版本迁移

如果用户从使用系统标准数据目录的版本升级：

1. 检测旧数据目录是否存在
2. 提示用户是否迁移数据
3. 复制所有数据到新的 `ocs-data` 目录
4. 更新配置文件中的路径
5. 保留旧数据目录作为备份

### 手动迁移步骤

1. 关闭应用程序
2. 定位旧数据目录:
   - Linux: `~/.config/ocs-desktop/`
3. 复制所有内容到 `ocs-data` 目录
4. 启动应用程序，验证数据完整性

---

## 权限管理

### 目录权限

- `ocs-data` 及其子目录: `755` (rwxr-xr-x)
- 配置文件: `644` (rw-r--r--)
- 日志文件: `644` (rw-r--r--)
- 浏览器数据目录: `700` (rwx------) - 仅用户可访问

### 权限设置

应用程序在创建目录时会自动设置正确的权限，确保:
- 用户可以读写所有数据
- 其他用户无法访问敏感数据（如浏览器数据）
- 日志文件可以被系统日志工具读取

---

## 备份和恢复

### 备份策略

建议定期备份以下内容：

1. **配置文件**: `config.json`
2. **浏览器数据**: `userDataDirs/` 整个目录
3. **扩展文件**: `downloads/extensions/` 目录
4. **重要日志**: 最近的日志文件

### 备份命令示例

```bash
# 创建备份
tar -czf ocs-desktop-backup-$(date +%Y%m%d).tar.gz ocs-data/

# 恢复备份
tar -xzf ocs-desktop-backup-20260203.tar.gz
```

### 恢复步骤

1. 关闭应用程序
2. 删除或重命名现有的 `ocs-data` 目录
3. 解压备份文件
4. 启动应用程序验证

---

## 清理和维护

### 日志清理

建议定期清理旧日志文件：

```bash
# 删除 30 天前的日志
find ocs-data/logs -type d -mtime +30 -exec rm -rf {} +
```

### 缓存清理

浏览器缓存占用大量空间时，可以清理：

```bash
# 清理所有浏览器实例的缓存
find ocs-data/userDataDirs -type d -name "Cache" -exec rm -rf {} +
```

### 磁盘空间监控

定期检查 `ocs-data` 目录大小：

```bash
# 查看总大小
du -sh ocs-data/

# 查看各子目录大小
du -sh ocs-data/*/
```

---

## 故障排除

### 常见问题

**问题 1**: 应用程序无法创建数据目录

**解决方案**:
- 检查 AppImage 所在目录的写权限
- 确保 `APPIMAGE` 环境变量正确设置

**问题 2**: 配置文件损坏

**解决方案**:
- 删除 `config.json`
- 重启应用程序，将创建默认配置

**问题 3**: 浏览器数据丢失

**解决方案**:
- 检查 `userDataDirs/` 目录是否存在
- 从备份恢复数据

---

## 安全注意事项

1. **数据加密**: 应用程序支持数据加密功能，可在配置中启用
2. **敏感数据**: Cookie 和密码等敏感数据存储在浏览器数据目录中
3. **访问控制**: 浏览器数据目录权限设置为 700，仅用户可访问
4. **备份安全**: 备份文件应妥善保管，避免泄露

---

## 版本兼容性

### 当前版本: 2.9.31

- 支持新的数据存储结构（ocs-data 目录）
- 兼容旧版本的数据格式
- 提供数据迁移工具

### 升级建议

- 升级前备份现有数据
- 首次启动新版本时，按照提示迁移数据
- 验证数据完整性后，可删除旧数据目录

---

## 附录

### A. 完整目录树

```
ocs-data/
├── config.json
├── logs/
│   ├── 2026-02-03/
│   │   ├── app.log
│   │   ├── store-init.log
│   │   ├── task.log
│   │   └── utils.log
│   └── [其他日期目录]
├── downloads/
│   ├── extensions/
│   │   ├── example-extension.crx
│   │   └── another-extension.zip
│   └── [其他下载文件]
└── userDataDirs/
    ├── browser-001/
    │   ├── Default/
    │   ├── Preferences
    │   ├── Cookies
    │   ├── History
    │   ├── Local Storage/
    │   ├── IndexedDB/
    │   ├── Cache/
    │   └── [其他浏览器数据]
    ├── browser-002/
    └── [更多实例]
```

### B. 配置文件示例

```json
{
  "name": "OCS Desktop",
  "version": "2.9.31",
  "paths": {
    "app-path": "/home/user/apps/OCS-Desktop-2.9.31.AppImage",
    "user-data-path": "/home/user/apps/ocs-data",
    "exe-path": "/home/user/apps/OCS-Desktop-2.9.31.AppImage",
    "logs-path": "/home/user/apps/ocs-data/logs",
    "config-path": "/home/user/apps/ocs-data/config.json",
    "userDataDirsFolder": "/home/user/apps/ocs-data/userDataDirs",
    "downloadFolder": "/home/user/apps/ocs-data/downloads",
    "extensionsFolder": "/home/user/apps/ocs-data/downloads/extensions"
  },
  "app": {
    "video_frame_rate": 1,
    "data_encryption": false
  },
  "window": {
    "alwaysOnTop": false,
    "autoLaunch": false
  },
  "server": {
    "port": 15319,
    "authToken": ""
  },
  "render": {}
}
```

### C. 环境变量

| 变量名 | 用途 | 示例值 |
|-------|------|--------|
| `APPIMAGE` | AppImage 文件路径 | `/home/user/apps/OCS-Desktop.AppImage` |

---

**文档版本**: 1.0  
**最后更新**: 2026-02-03  
**适用版本**: OCS Desktop 2.9.31+  
**平台**: Linux (AppImage)