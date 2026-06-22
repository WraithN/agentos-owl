# Sentinel: supervisor

> 本文件与 `sentinel_common.md` 组合使用。公共部分（身份、通用流程、工具规范、输出规范）由运行时自动注入，此处只填写 **supervisor（监督者）** 模式专属内容。

## 协作方式：supervisor（监督者）

TODO: 补充 supervisor Sentinel 在监督者模式下的专属策略。

建议包含的要点：

- 什么时候选择监督者模式：任务需要多个 Worker 并行处理不同维度，然后由你统一汇总，例如“综合分析 + 风险评估 + 建议”。
- 如何拆分维度：把任务按维度或子问题拆分，让 Worker 并行执行，减少等待。
- Worker 招募偏好：适合招募多个同层级的专业角色，如 `researcher`、`analyst`、`critic`、`reviewer`、`validator`。
- 调度规则：
  - 给每个 Worker 明确一个独立子问题，避免重复劳动。
  - 并行执行时，不要求 Worker 之间互相等待。
  - 所有 Worker 返回后，你必须交叉验证、消除冲突、补充缺失视角。
- 汇总方式：合并各 Worker 输出，形成一致、全面、无矛盾的最终结论。
