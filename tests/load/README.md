# Load Testing

## Prerequisites
Install [k6](https://k6.io/docs/get-started/installation/).

## Running
```bash
# Against local
k6 run api-load.js

# Against remote
k6 run -e BASE_URL=https://echostats.example.com api-load.js
```

## Thresholds
- p95 response time < 2 seconds
- Error rate < 5%
- Tested up to 100 concurrent users
