# Block External Access to a Port (Docker Services)

This guide explains how to block external access to a port while allowing localhost access. This is particularly important for services like Supabase Studio that should only be accessible through a reverse proxy (like Nginx) with authentication.

## Problem

When using Docker (e.g., Supabase CLI), services bind to `0.0.0.0:PORT`, making them accessible from anywhere. Even if you protect them with Nginx and authentication, direct IP:port access bypasses the protection.

**Example:** Supabase Studio on port 3003 is accessible via:
- ✅ `https://db.example.com` (protected by Nginx + auth)
- ❌ `http://YOUR_IP:3003` (bypasses protection - security risk!)

## Solution: Block External Access with iptables

Since Docker bypasses UFW by manipulating iptables directly, we need to use iptables rules that work with Docker's port forwarding.

### Prerequisites

- Root or sudo access
- `iptables-persistent` installed (to save rules permanently)
- Understanding of which port to block

### Step-by-Step Instructions

#### Step 1: Remove any existing ineffective rules

If you previously tried blocking with UFW or DOCKER-USER chain, remove those rules:

```bash
# Remove UFW rule (if exists)
sudo ufw delete deny 3003/tcp

# Remove DOCKER-USER rule (if exists)
sudo iptables -D DOCKER-USER -p tcp --dport 3003 ! -s 127.0.0.1 -j DROP
```

#### Step 2: Add blocking rule in INPUT chain

Add a rule to block external access in the INPUT chain:

```bash
sudo iptables -I INPUT 1 -p tcp --dport 3003 ! -s 127.0.0.1 -j REJECT --reject-with tcp-reset
```

**Replace `3003` with your target port.**

This rule:
- Blocks TCP traffic to port 3003
- Allows connections from localhost (127.0.0.1)
- Rejects external connections with TCP reset

#### Step 3: Verify the rule was added

```bash
sudo iptables -L INPUT -n -v --line-numbers | grep 3003
```

You should see output like:
```
1        0     0 REJECT     6    --  *      *      !127.0.0.1            0.0.0.0/0            tcp dpt:3003 reject-with tcp-reset
```

#### Step 4: Check Docker's port forwarding

If the service is running in Docker, check how Docker is forwarding the port:

```bash
# Find the container
docker ps | grep studio  # or your service name

# Check port binding
docker port $(docker ps -q --filter "name=studio") 2>/dev/null

# Check Docker's NAT rules
sudo iptables -t nat -L DOCKER -n -v | grep 3003
```

#### Step 5: Block in PREROUTING (if Docker is involved)

If Docker is forwarding the port, Docker's DNAT rules run in PREROUTING before the INPUT chain. We need to block it earlier:

```bash
sudo iptables -t nat -I PREROUTING 1 -p tcp --dport 3003 ! -s 127.0.0.1 -j REDIRECT --to-port 65535
```

This redirects external traffic to a non-existent port before Docker processes it.

**Replace `3003` with your target port.**

#### Step 6: Test localhost access (should work)

```bash
curl -I http://127.0.0.1:3003
```

This should succeed (you should get an HTTP response).

#### Step 7: Test external access (should be blocked)

Try accessing from an external machine or browser:
- `http://YOUR_SERVER_IP:3003`

This should fail with:
- Connection refused
- Connection timeout
- TCP reset

#### Step 8: Save rules permanently

Install iptables-persistent if not already installed:

```bash
sudo apt-get install iptables-persistent -y
```

Save the rules:

```bash
sudo netfilter-persistent save
```

Verify the rules were saved:

```bash
sudo cat /etc/iptables/rules.v4 | grep 3003
```

## Complete Example: Blocking Port 3003

Here's the complete sequence for blocking port 3003:

```bash
# 1. Remove old rules (if any)
sudo iptables -D DOCKER-USER -p tcp --dport 3003 ! -s 127.0.0.1 -j DROP 2>/dev/null

# 2. Block in INPUT chain
sudo iptables -I INPUT 1 -p tcp --dport 3003 ! -s 127.0.0.1 -j REJECT --reject-with tcp-reset

# 3. Block in PREROUTING (for Docker)
sudo iptables -t nat -I PREROUTING 1 -p tcp --dport 3003 ! -s 127.0.0.1 -j REDIRECT --to-port 65535

# 4. Verify
sudo iptables -L INPUT -n -v | grep 3003
sudo iptables -t nat -L PREROUTING -n -v | grep 3003

# 5. Test
curl -I http://127.0.0.1:3003  # Should work
# Try external access - should be blocked

# 6. Save
sudo netfilter-persistent save
```

## Removing the Block

If you need to remove the block later:

```bash
# Remove INPUT rule
sudo iptables -D INPUT -p tcp --dport 3003 ! -s 127.0.0.1 -j REJECT --reject-with tcp-reset

# Remove PREROUTING rule
sudo iptables -t nat -D PREROUTING -p tcp --dport 3003 ! -s 127.0.0.1 -j REDIRECT --to-port 65535

# Save
sudo netfilter-persistent save
```

## Troubleshooting

### Rule exists but external access still works

1. **Check rule order:** Docker's rules might be processed first
   ```bash
   sudo iptables -L INPUT -n -v --line-numbers | head -20
   sudo iptables -t nat -L PREROUTING -n -v | head -20
   ```

2. **Check if Docker is involved:**
   ```bash
   docker ps | grep <your-service>
   sudo iptables -t nat -L DOCKER -n -v | grep <port>
   ```

3. **Try blocking on specific interface:**
   ```bash
   # Find your external interface
   ip route | grep default
   
   # Block on that interface (replace eth0 with your interface)
   sudo iptables -I INPUT -i eth0 -p tcp --dport 3003 ! -s 127.0.0.1 -j REJECT --reject-with tcp-reset
   ```

### Localhost access is blocked

If localhost access stops working, check the rule:

```bash
sudo iptables -L INPUT -n -v | grep 3003
```

The rule should show `!127.0.0.1` (NOT 127.0.0.1), meaning it allows localhost.

### Rules not persisting after reboot

1. Ensure `iptables-persistent` is installed:
   ```bash
   sudo apt-get install iptables-persistent -y
   ```

2. Save rules manually:
   ```bash
   sudo netfilter-persistent save
   ```

3. Check if the service is enabled:
   ```bash
   sudo systemctl status netfilter-persistent
   ```

## Security Notes

- **Always test both localhost and external access** after applying rules
- **Save rules permanently** to prevent them from being lost on reboot
- **Document which ports are blocked** for your team
- **Use Nginx/auth in addition to port blocking** for defense in depth
- **Regularly audit your firewall rules** to ensure they're still needed

## Related Documentation

- [UFW Supabase Fix](./UFW_SUPABASE_FIX.md) - UFW configuration for Supabase
- [Supabase Port 3010 Issue](./SUPABASE_PORT_3010_ISSUE.md) - Port configuration issues
- [Production Deployment Guide](../deploy/PRODUCTION_DEPLOYMENT_GUIDE.md) - Full deployment setup
