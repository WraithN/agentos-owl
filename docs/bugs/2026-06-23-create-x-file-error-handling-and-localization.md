# create_x_file 错误处理与工具描述本地化

## 现象

代码审查发现 `apps/desktop/src/agent/tools.ts` 存在两个问题：

1. `create_x_file` 工具的 `execute` 函数使用 `try/catch` 捕获 `writeXFile` 抛出的异常，并将错误信息编码为工具返回内容（`textResult`）。这违反了 `pi-agent-core` 的工具契约——工具执行错误应当通过抛出异常上报，而不是以普通文本内容返回。
2. `read_file`、`list_directory`、`execute_command` 三个工具的描述字段使用英文，与工具集中其他工具的中文描述风格不一致。

## 根因

- `create_x_file` 实现时为了向调用方展示“友好错误信息”，在 `execute` 内部手动捕获并包装了所有异常，导致运行时框架无法按标准错误路径处理失败。
- 早期实现中部分工具描述直接沿用了英文文案，未统一进行中文化。

## 解决方案

1. 移除 `create_x_file` 中 `execute` 的 `try/catch`，让 `writeXFile` 的异常自然抛出，符合 `pi-agent-core` 工具契约。
2. 将 `read_file`、`list_directory`、`execute_command` 的 `description` 更新为中文，与其他工具保持一致。

## 验证结果

- `pnpm typecheck` 通过
- `pnpm lint` 通过（Biome 检查 121 个文件，无警告）
- `pnpm test` 通过（15 个测试文件，47 个测试全部通过）
