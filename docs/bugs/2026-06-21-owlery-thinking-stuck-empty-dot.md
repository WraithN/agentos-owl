# Owlery 前端一直思考与时间线空点

## Phenomenon

用户发送消息后，前端可能长期显示“正在思考…”。同时消息时间线会先出现一个没有文字内容的空点，第二个点才展示“正在思考…”或实际内容。

## Root Cause

前端 `applyChunk` 在收到任意 chunk 前都会先插入一个空的 assistant 占位消息，导致时间线先渲染空点。后端 `SessionSlot` 的 Worker error / abnormal exit 没有稳定转换为前端可消费的 `error` chunk，导致前端 `isRunning` 无法结束。

## Solution

前端在只收到 `done` 且没有 assistant 消息时直接结束运行，不再生成空占位；assistant 消息初始 content 改为空数组，依赖同一批 chunk 更新填充内容。后端在 `SessionSlot` Worker error / non-zero exit 时设置失败状态并 emit error；`Owlery` 将 slot error 广播为 `error` chunk 给前端，前端据此结束 running 状态。
