---
name: Server Management
description: Server administration: monitoring, logging, scaling, security
---

# Server Management

## Monitoring Stack
- Metrics: Prometheus + Grafana
- Logs: ELK (Elasticsearch, Logstash, Kibana) or Loki
- Tracing: Jaeger or Datadog APM
- Alerts: PagerDuty or Opsgenie

## Key Metrics
- CPU, memory, disk, network utilization
- Request rate, error rate, latency (RED method)
- Database connection pool utilization
- Queue depth and processing time

## Scaling
- Vertical: bigger instance (quick, limited)
- Horizontal: more instances behind load balancer
- Auto-scaling: based on CPU/memory/custom metrics

## Security
- SSH key-only access (no passwords)
- Firewall: allow only necessary ports
- Regular security updates
- Principle of least privilege for service accounts
