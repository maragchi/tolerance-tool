# 公差工具开发路线图

## 总览

6个阶段，每阶段独立可测，做完一步再走下一步。

| 阶段 | 内容 | 产出 | 预估 |
|------|------|------|------|
| FLOW-01 | 数据基础 | JSON数据文件 | 1-2h |
| FLOW-02 | 基础查询 | 输入公差代号→输出极限偏差 | 2-3h |
| FLOW-03 | 配合推荐 | 输入工况→推荐配合 | 2-3h |
| FLOW-04 | 场景案例 | 轴承/键槽等典型案例 | 1-2h |
| FLOW-05 | 成本提示 | 公差等级→加工方法+成本 | 1-2h |
| FLOW-06 | 打磨上线 | PWA + 响应式 + 部署 | 2-3h |

## 状态跟踪

- [ ] FLOW-01 数据基础
- [ ] FLOW-02 基础查询
- [ ] FLOW-03 配合推荐
- [ ] FLOW-04 场景案例
- [ ] FLOW-05 成本提示
- [ ] FLOW-06 打磨上线

## 数据来源

所有数据已通过 Claude + DeepSeek + 豆包 三方交叉验证。
- 豆包答案原文：C:\Users\wwwHU\Desktop\豆包.txt
- DeepSeek答案原文：C:\Users\wwwHU\Desktop\DeepSeek.txt
- GB/T 275-2015 PDF：C:\Users\wwwHU\Desktop\GB-T 275-2015 轴承标准.pdf
- ISO 286 数据：wiki/concepts/ISO 286 Standard Tolerance Data.md
