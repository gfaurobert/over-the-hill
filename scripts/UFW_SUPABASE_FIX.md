# UFW Configuration for Supabase Local Development

## Current Status
- ✅ UFW is **active** (enabled)
- ✅ Docker is running
- ⚠️  Supabase ports are **NOT configured** in UFW
- ⚠️  Port 3010 (REST Admin API) is not accessible

## Issue
The error `dial tcp 127.0.0.1:3010: connect: connection refused` suggests that UFW might be blocking localhost connections, or the ports need to be explicitly allowed.

## Solution

### Option 1: Open All Supabase Ports (Recommended)

Run these commands to open all required Supabase ports:

```bash
sudo ufw allow 3010/tcp    # REST Admin API
sudo ufw allow 54321/tcp   # Kong API Gateway
sudo ufw allow 54322/tcp   # Postgres database
sudo ufw allow 54323/tcp   # GoTrue (Auth)
sudo ufw allow 54324/tcp   # PostgREST (REST API)
sudo ufw allow 54325/tcp   # Realtime
sudo ufw allow 54326/tcp   # Storage
sudo ufw allow 54327/tcp   # imgproxy
sudo ufw allow 54328/tcp   # Studio
```

### Option 2: Use the Automated Script

Run the check script with the `--open` flag:

```bash
sudo bash scripts/check-supabase-ports.sh --open
```

### Option 3: Allow Localhost Connections (If UFW is blocking localhost)

If UFW is blocking localhost connections, you can allow them:

```bash
sudo ufw allow from 127.0.0.1
```

### Verify Configuration

After opening the ports, verify the configuration:

```bash
sudo ufw status verbose
```

You should see the ports listed in the output.

### Restart Supabase

After configuring UFW, try starting Supabase again:

```bash
npx supabase start
```

## Additional Troubleshooting

If the issue persists after opening the ports:

1. **Check if UFW is blocking localhost:**
   ```bash
   sudo ufw status numbered | grep -i localhost
   ```

2. **Check Docker network:**
   ```bash
   docker network ls
   docker ps -a
   ```

3. **Run Supabase with debug mode:**
   ```bash
   npx supabase start --debug
   ```

4. **Check if there are any conflicting firewall rules:**
   ```bash
   sudo iptables -L -n -v | grep 3010
   ```

## Notes

- These ports are for **local development only** (localhost connections)
- If you're running Supabase in production, you'll need different firewall rules
- UFW typically allows localhost connections by default, but explicit rules ensure compatibility

