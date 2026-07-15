#!/bin/bash

# NL2BI 测试脚本

set -e

API_BASE_URL="${API_BASE_URL:-http://localhost:8000}"
AUTH_USERNAME="${AUTH_USERNAME:-admin}"
AUTH_PASSWORD="${AUTH_PASSWORD:-admin123}"

echo "=== NL2BI 系统测试 ==="

# 测试后端健康检查
echo "1. 测试后端健康检查..."
curl -s "$API_BASE_URL/health"
echo ""

# 登录并获取 Token
echo "2. 测试管理员登录..."
TOKEN=$(curl -s -X POST "$API_BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"username\": \"$AUTH_USERNAME\", \"password\": \"$AUTH_PASSWORD\"}" \
  | python3 -c 'import json, sys; print(json.load(sys.stdin)["token"])')
echo "登录成功"

# 测试查询接口
echo "3. 测试查询接口..."
curl -s -X POST "$API_BASE_URL/api/query" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"query": "查询每个地区的销售总额"}'
echo ""

# 测试获取表信息
echo "4. 测试获取表信息..."
curl -s "$API_BASE_URL/api/tables" -H "Authorization: Bearer $TOKEN"
echo ""

# 测试获取 schema
echo "5. 测试获取 schema..."
curl -s "$API_BASE_URL/api/schema" -H "Authorization: Bearer $TOKEN"
echo ""

echo "=== 测试完成 ==="
