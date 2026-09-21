# VBot CLI

> VBot 命令行工具集 | Command line tools for the VBot ecosystem

## 安装

```bash
npm install -g vbot-cli
```

或直接使用 npx:

```bash
npx vbot-cli init my-project
```

## 命令

### `vbot init [name]`

初始化一个新项目。

```bash
vbot init my-app
vbot init my-app --template default
```

### `vbot deploy [target]`

部署项目到目标环境。

```bash
vbot deploy production
vbot deploy staging --env .env.staging
vbot deploy preview --no-build
```

支持的部署目标：`production`、`staging`、`preview`

### `vbot status [service]`

检查服务状态。

```bash
vbot status
vbot status api
vbot status --verbose
```

## 选项

所有命令支持 `--help` 查看详细用法：

```bash
vbot --help
vbot init --help
vbot deploy --help
vbot status --help
```

## License

Apache-2.0
