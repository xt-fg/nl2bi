#!/bin/bash

# NL2BI 测试脚本

echo "=== NL2BI 系统测试 ==="

# 测试后端健康检查
echo "1. 测试后端健康检查..."
curl -s http://localhost:8000/health
echo ""

# 测试查询接口
echo "2. 测试查询接口..."
curl -s -X POST http://localhost:8000/api/query \
  -H "Content-Type: application/json" \
  -d '{"query": "查询每个地区的销售总额"}'
echo ""

# 测试获取表信息
echo "3. 测试获取表信息..."
curl -s http://localhost:8000/api/tables
echo ""

# 测试获取 schema
echo "4. 测试获取 schema..."
curl -s http://localhost:8000/api/schema
echo ""

echo "=== 测试完成 ==="