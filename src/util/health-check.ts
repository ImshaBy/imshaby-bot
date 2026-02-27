import { createClient, RedisClientType } from 'redis';
import mongoose from 'mongoose';
import { getRedisUrl } from '../config';
import logger from './logger';

// Singleton Redis client for health checks
let redisClient: RedisClientType | null = null;
let redisConnecting = false;

async function getRedisClient(): Promise<RedisClientType> {
    if (redisClient && redisClient.isOpen) {
        return redisClient;
    }

    if (redisConnecting) {
        // Wait for the connection to be established
        await new Promise(resolve => setTimeout(resolve, 100));
        return getRedisClient();
    }

    redisConnecting = true;
    try {
        redisClient = createClient({ url: getRedisUrl() });
        
        redisClient.on('error', (err) => {
            logger.error(null, 'Health check Redis client error: %O', err);
        });

        await redisClient.connect();
        return redisClient;
    } finally {
        redisConnecting = false;
    }
}

export interface HealthStatus {
    status: 'ok' | 'degraded' | 'error';
    message: string;
    mongodb: {
        status: 'connected' | 'disconnected' | 'connecting' | 'disconnecting';
        healthy: boolean;
    };
    redis: {
        connected: boolean;
        role: string | null;
        isMaster: boolean;
        canWrite: boolean;
        error?: string;
    };
}

function getMongoStatus(): HealthStatus['mongodb'] {
    const stateMap: Record<number, 'disconnected' | 'connected' | 'connecting' | 'disconnecting'> = {
        0: 'disconnected',
        1: 'connected',
        2: 'connecting',
        3: 'disconnecting'
    };
    
    const readyState = mongoose.connection.readyState;
    const status = stateMap[readyState] || 'disconnected';
    
    return {
        status,
        healthy: readyState === 1
    };
}

async function getRedisStatus(): Promise<HealthStatus['redis']> {
    try {
        const client = await getRedisClient();
        
        // Ping to check connectivity
        await client.ping();
        
        // Get replication info to determine role
        const info = await client.info('replication');
        const roleMatch = info.match(/role:(\w+)/);
        const role = roleMatch ? roleMatch[1] : null;
        
        const isMaster = role === 'master';
        
        return {
            connected: true,
            role,
            isMaster,
            canWrite: isMaster
        };
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        return {
            connected: false,
            role: null,
            isMaster: false,
            canWrite: false,
            error: errorMessage
        };
    }
}

export async function getHealthStatus(): Promise<HealthStatus> {
    const mongoStatus = getMongoStatus();
    const redisStatus = await getRedisStatus();
    
    const allHealthy = mongoStatus.healthy && redisStatus.connected && redisStatus.canWrite;
    const anyConnected = mongoStatus.healthy || redisStatus.connected;
    
    let status: HealthStatus['status'];
    let message: string;
    
    if (allHealthy) {
        status = 'ok';
        message = 'All services are healthy';
    } else if (anyConnected) {
        status = 'degraded';
        const issues: string[] = [];
        if (!mongoStatus.healthy) issues.push('MongoDB not connected');
        if (!redisStatus.connected) issues.push('Redis not connected');
        else if (!redisStatus.canWrite) issues.push('Redis is not master (read-only)');
        message = `Service degraded: ${issues.join(', ')}`;
    } else {
        status = 'error';
        message = 'All services are down';
    }
    
    return {
        status,
        message,
        mongodb: mongoStatus,
        redis: redisStatus
    };
}
