# Redis High-Availability Recommendations

This document provides Redis configuration recommendations for session storage in Docker environments.

## Common Problems with Default Redis Docker Configuration

- No persistence (data loss on restart)
- No health checks
- No restart policies
- No memory limits (can OOM-kill)
- Incorrect working directory (e.g., `/etc` instead of `/data`)

---

## Option 1: Hardened Single Redis (Recommended for Start)

This is the **simplest improvement** that handles 90% of failures:

```yaml
version: '3.8'
services:
  redis:
    image: redis:7-alpine
    container_name: redis-session
    restart: always
    command: >
      redis-server
      --dir /data
      --dbfilename dump.rdb
      --appendonly yes
      --appendfilename "appendonly.aof"
      --appendfsync everysec
      --save 900 1
      --save 300 10
      --save 60 10000
      --maxmemory 256mb
      --maxmemory-policy allkeys-lru
      --tcp-keepalive 300
      --timeout 0
    volumes:
      - redis_data:/data
    ports:
      - "6379:6379"
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5
      start_period: 30s
    deploy:
      resources:
        limits:
          memory: 512M

volumes:
  redis_data:
    driver: local
```

### Configuration Explained

| Setting | Purpose |
|---------|---------|
| `--dir /data` | Explicitly sets the working directory for Redis |
| `--dbfilename dump.rdb` | Sets the correct RDB filename |
| `--appendonly yes` | Enables AOF persistence (logs every write) |
| `--appendfsync everysec` | Syncs to disk every second (good balance of safety/performance) |
| `--save` rules | Creates RDB snapshots as backup |
| `--maxmemory 256mb` | Prevents Redis from consuming all RAM |
| `--maxmemory-policy allkeys-lru` | Evicts least-recently-used keys when full (safe for sessions) |
| `healthcheck` | Docker automatically restarts unhealthy containers |
| `restart: always` | Auto-restart on failure |
| `volumes: redis_data:/data` | Mounts a persistent volume with correct permissions |

---

## Option 2: Redis Sentinel (True HA - Master + Replicas + Failover)

If you need **automatic failover** (zero downtime), use Redis Sentinel:

```yaml
version: '3.8'
services:
  redis-master:
    image: redis:7-alpine
    container_name: redis-master
    command: >
      redis-server
      --dir /data
      --appendonly yes
      --appendfsync everysec
      --maxmemory 256mb
      --maxmemory-policy allkeys-lru
    volumes:
      - redis_master_data:/data
    networks:
      - redis-net
    restart: always

  redis-replica:
    image: redis:7-alpine
    container_name: redis-replica
    command: redis-server --replicaof redis-master 6379 --appendonly yes --dir /data
    depends_on:
      - redis-master
    volumes:
      - redis_replica_data:/data
    networks:
      - redis-net
    restart: always

  redis-sentinel-1:
    image: redis:7-alpine
    container_name: redis-sentinel-1
    command: >
      sh -c 'echo "sentinel monitor mymaster redis-master 6379 2" > /tmp/sentinel.conf &&
             echo "sentinel down-after-milliseconds mymaster 5000" >> /tmp/sentinel.conf &&
             echo "sentinel failover-timeout mymaster 60000" >> /tmp/sentinel.conf &&
             echo "sentinel parallel-syncs mymaster 1" >> /tmp/sentinel.conf &&
             redis-sentinel /tmp/sentinel.conf'
    depends_on:
      - redis-master
      - redis-replica
    networks:
      - redis-net
    restart: always

  redis-sentinel-2:
    image: redis:7-alpine
    container_name: redis-sentinel-2
    command: >
      sh -c 'echo "sentinel monitor mymaster redis-master 6379 2" > /tmp/sentinel.conf &&
             echo "sentinel down-after-milliseconds mymaster 5000" >> /tmp/sentinel.conf &&
             echo "sentinel failover-timeout mymaster 60000" >> /tmp/sentinel.conf &&
             echo "sentinel parallel-syncs mymaster 1" >> /tmp/sentinel.conf &&
             redis-sentinel /tmp/sentinel.conf'
    depends_on:
      - redis-master
      - redis-replica
    networks:
      - redis-net
    restart: always

  redis-sentinel-3:
    image: redis:7-alpine
    container_name: redis-sentinel-3
    command: >
      sh -c 'echo "sentinel monitor mymaster redis-master 6379 2" > /tmp/sentinel.conf &&
             echo "sentinel down-after-milliseconds mymaster 5000" >> /tmp/sentinel.conf &&
             echo "sentinel failover-timeout mymaster 60000" >> /tmp/sentinel.conf &&
             echo "sentinel parallel-syncs mymaster 1" >> /tmp/sentinel.conf &&
             redis-sentinel /tmp/sentinel.conf'
    depends_on:
      - redis-master
      - redis-replica
    networks:
      - redis-net
    restart: always

networks:
  redis-net:
    driver: bridge

volumes:
  redis_master_data:
  redis_replica_data:
```

### Node.js Sentinel Connection

To use Sentinel, you need a Sentinel-aware client configuration:

```typescript
import { Redis } from "ioredis";

const redis = new Redis({
  sentinels: [
    { host: "redis-sentinel-1", port: 26379 },
    { host: "redis-sentinel-2", port: 26379 },
    { host: "redis-sentinel-3", port: 26379 },
  ],
  name: "mymaster", // Sentinel master name
});
```

---

## When to Use Each Option

### Use Option 1 (Hardened Single Redis) when:
- You have moderate traffic
- Brief downtime during restarts is acceptable
- You want minimal operational overhead
- Session data is recoverable (users can re-authenticate)

### Use Option 2 (Redis Sentinel) when:
- You have thousands of concurrent users
- Even brief downtime is unacceptable
- You have infrastructure to manage 4+ containers
- You need automatic failover

---

## Troubleshooting

### Error: "Failed opening the RDB file ... Permission denied"

This happens when Redis tries to save data to a directory it doesn't have write access to (e.g., `/etc`).

**Fix**: Ensure you have:
1. `--dir /data` in the Redis command
2. A volume mounted at `/data`

### Verification Commands

Check Redis working directory:
```bash
docker exec redis-session redis-cli CONFIG GET dir
# Should return: 1) "dir" 2) "/data"
```

Test persistence:
```bash
docker exec redis-session redis-cli BGSAVE
docker exec redis-session redis-cli LASTSAVE
```

Check memory usage:
```bash
docker exec redis-session redis-cli INFO memory
```

---

## Quick Reference

### Minimal Production-Ready Configuration

```yaml
redis:
  image: redis:7-alpine
  restart: always
  command: >
    redis-server
    --dir /data
    --appendonly yes
    --maxmemory 256mb
    --maxmemory-policy allkeys-lru
  volumes:
    - redis_data:/data
  healthcheck:
    test: ["CMD", "redis-cli", "ping"]
    interval: 10s
    timeout: 5s
    retries: 3

volumes:
  redis_data:
```

This provides:
- ✅ Data persistence across restarts
- ✅ Auto-restart on crashes
- ✅ Memory limits to prevent OOM kills
- ✅ Graceful eviction of old sessions when memory is full
- ✅ Health checks for container orchestration


