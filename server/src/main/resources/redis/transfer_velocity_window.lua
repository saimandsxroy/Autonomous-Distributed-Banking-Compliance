-- KEYS[1] = velocity key e.g. "velocity:{accountId}:2m"
-- ARGV[1] = current time in milliseconds
-- ARGV[2] = window size in milliseconds (120000 = 2 minutes)
-- ARGV[3] = max transactions allowed
-- ARGV[4] = transfer amount (as string)
-- Returns: {tx_count, total_volume, window_start}

local key = KEYS[1]
local now_ms = tonumber(ARGV[1])
local window_ms = tonumber(ARGV[2])
local max_tx = tonumber(ARGV[3])
local amount = ARGV[4]
local window_start = now_ms - window_ms

-- Remove entries outside the sliding window
redis.call('ZREMRANGEBYSCORE', key, '-inf', window_start)

-- Count current entries in window
local tx_count = redis.call('ZCARD', key)

-- Add current transaction
redis.call('ZADD', key, now_ms, now_ms .. ':' .. amount)

-- Set TTL on window key (auto-expire after 2x window)
redis.call('EXPIRE', key, math.floor(window_ms / 500))

-- Compute total volume
local entries = redis.call('ZRANGEBYSCORE', key, window_start, '+inf')
local total_volume = 0
for _, entry in ipairs(entries) do
    local parts = {}
    for part in string.gmatch(entry, '([^:]+)') do
        table.insert(parts, part)
    end
    if #parts >= 2 then
        total_volume = total_volume + tonumber(parts[2]) or 0
    end
end

return {tx_count + 1, tostring(total_volume), tostring(window_start)}
