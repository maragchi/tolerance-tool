# FLOW-01: 数据基础

## 目标
把豆包和DeepSeek提供的结构化数据整理成 JSON 文件，供后续功能直接引用。

## 需要创建的文件

### 1. `data/iso286-tolerances.json`
ISO 286 标准公差数值表（IT1-IT18 × 尺寸分段）。
数据来源：wiki/concepts/ISO 286 Standard Tolerance Data.md

### 2. `data/iso286-fundamental-deviations.json`
轴偏差（a-zc）和孔偏差（A-ZC）数值表。
数据来源：wiki/concepts/ISO 286 Standard Tolerance Data.md

### 3. `data/fit-recommendations.json`
优先配合特性及适用举例表。

字段设计：
```json
{
  "fits": [
    {
      "code": "H7/g6",
      "type": "clearance",
      "basis": "hole",
      "clearanceType": "间隙很小",
      "assembly": "手动装配",
      "characteristics": "定心精度高，滑动灵活",
      "applications": ["精密滑动轴承", "导柱导套", "机床主轴与滑动轴承"],
      "source": "GB/T 1801-2009 附录A"
    }
  ]
}
```
数据来源：豆包.txt 第13-27行 + DeepSeek.txt 第67-78行

### 4. `data/bearing-fits.json`
GB/T 275-2015 轴承配合推荐表。

字段设计：
```json
{
  "innerRing": [
    {
      "condition": "轻载荷(P≤0.07Cr)，内圈旋转",
      "diameterRange": "所有尺寸",
      "toleranceClass": "h5、h6",
      "applications": ["电机", "水泵", "风机"]
    }
  ],
  "outerRing": [...]
}
```
数据来源：豆包.txt 第99-117行

### 5. `data/manufacturing-methods.json`
公差等级与加工方法对照表。

字段设计：
```json
{
  "grades": [
    {
      "grade": "IT5",
      "methods": ["研磨", "珩磨", "超精磨", "金刚石车削"],
      "roughnessRa": "0.1~0.4",
      "precisionRange": "0.001~0.01mm",
      "applications": ["量规", "精密轴承", "精密丝杠", "液压阀阀芯"]
    }
  ]
}
```
数据来源：豆包.txt 第36-45行

### 6. `data/cost-multipliers.json`
加工成本倍率表。

字段设计：
```json
{
  "baseline": "IT12",
  "grades": [
    { "grade": "IT12", "multiplier": 1.0, "increase": "基础" },
    { "grade": "IT11", "multiplier": 1.2, "increase": "+20%" },
    { "grade": "IT10", "multiplier": 1.5, "increase": "+50%" },
    { "grade": "IT9",  "multiplier": 2.0, "increase": "+100%" },
    { "grade": "IT8",  "multiplier": 2.7, "increase": "+170%" },
    { "grade": "IT7",  "multiplier": 4.0, "increase": "+300%" },
    { "grade": "IT6",  "multiplier": 7.0, "increase": "+600%" },
    { "grade": "IT5",  "multiplier": 15.0, "increase": "+1400%" }
  ],
  "perGradeIncrease": "30%-50%",
  "source": "mechtool.cn 行业统计数据"
}
```
数据来源：豆包.txt 第48-58行

### 7. `data/fit-decision-rules.json`
配合选择决策规则（第一层逻辑）。

```json
{
  "rules": [
    { "condition": "有相对运动", "fitType": "clearance", "example": "滑动轴承" },
    { "condition": "无相对运动，传递扭矩", "fitType": "interference", "example": "齿轮与轴" },
    { "condition": "无相对运动，不传递扭矩，需精确定位", "fitType": "transition", "example": "法兰与轴" },
    { "condition": "高温工作", "fitType": "clearance", "note": "需加大间隙" }
  ]
}
```
数据来源：互换性与测量技术教材通用知识

## 测试标准

完成后验证：
- [ ] 每个 JSON 文件语法正确（JSON.parse 不报错）
- [ ] 优先配合表覆盖全部13种基孔制优先配合
- [ ] 轴承配合表包含内圈和外圈两种工况
- [ ] 成本倍率表包含 IT5-IT12 共8个等级
- [ ] 所有数据标注来源标准号

## 状态
- [ ] 待开始
