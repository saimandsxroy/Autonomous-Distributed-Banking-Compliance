-- KEYS[1] = bucket key e.g. "rate:{accountId}"
-- ARGV[1] = current time in seconds
-- ARGV[2] = bucket capacity
-- ARGV[3] = refill rate per second
-- Returns: {allowed (1/0), remaining_tokens}

local key = KEYS[1]
local now = tonumber(ARGV[1])
local capacity = tonumber(ARGV[2])
local rate = tonumber(ARGV[3])

local bucket = redis.call('HMGET', key, 'tokens', 'last_refill')
local tokens = tonumber(bucket[1]) or capacity
local last_refill = tonumber(bucket[2]) or now

-- Refill tokens based on time elapsed
local elapsed = now - last_refill
local new_tokens = math.min(capacity, tokens + elapsed * rate)

if new_tokens >= 1 then
    new_tokens = new_tokens - 1
    redis.call('HMSET', key, 'tokens', new_tokens, 'last_refill', now)
    redis.call('EXPIRE', key, math.floor(capacity / rate) + 1)
    return {1, math.floor(new_tokens)}
else
    redis.call('HMSET', key, 'tokens', new_tokens, 'last_refill', now)
    redis.call('EXPIRE', key, math.floor(capacity / rate) + 1)
    return {0, 0}
end
