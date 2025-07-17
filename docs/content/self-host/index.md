---
title: Self-Hosting Guide (Ubuntu)
date: 2025-06-23
draft: false
description: This guide will help you deploy your Next.js app Over The Hill on your own Ubuntu server for production use.
tags:
  - getting-started
  - example
---

## 1. Prerequisites

- **Ubuntu server** (tested on 20.04/22.04)
- **Root or sudo access**
- **Domain name** (optional, for HTTPS)
- **Supabase Account** (or access to a self-hosted instance of supabase)

### Supabase Set-Up
The Web App uses Supabase as backend for authenticating and storing data.
You will have to set-up a project in Supabase and create the required tables in order for the app to run.

In the github repository of the project you will find a script to run in the SQL editor on Supabse in order to deploy the DB.

See link: https://github.com/gfaurobert/over-the-hill/blob/main/supabase/migrations/20250710091059_create_hill_chart_schema.sql

### Install Required Packages
```bash
sudo apt update
sudo apt install -y git curl build-essential
```

### Install Node.js (LTS) & pnpm
```bash
# Install Node.js (replace 20.x with latest LTS if needed)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Install pnpm globally
npm install -g pnpm
```

---

## 2. Clone the Repository
```bash
git clone https://github.com/gfaurobert/over-the-hill.git && cd over-the-hill
```

---

## 3. Install Dependencies
```bash
pnpm install
```

---

## 4. Create the .env.local

```shell
nano .env.local
```

Add the following environment variable

```text
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co

NEXT_PUBLIC_SUPABASE_ANON_KEY=your-very-long-token
```

---

## 5. Build the App
```bash
pnpm build
```

---

## 6. Run the App in Production

### Install pm2 (Process Manager)
```bash
npm install -g pm2
```

### Start the App
```bash
pm2 start "pnpm start" --name over-the-hill
```

### (Optional) Save pm2 Process List & Enable Startup on Boot
```bash
pm2 save
pm2 startup
# Follow the printed instructions to enable pm2 on boot
```

---

## 7. (Recommended) Set Up Nginx as a Reverse Proxy

### Check if Port 3000 is in Use
By default, Next.js runs on port 3000. To check if something is already using this port:

```bash
sudo netstat -tuln | grep 3000
```
- If you see output, port 3000 is in use. If there's no output, it's free.

### Using a Different Port
If port 3000 is occupied, you can run your app on another port (e.g., 3001):

1. **Start the app on a different port:**
   ```bash
   PORT=3001 pm2 start "pnpm start" --name hill-chart-generator
   ```
   (Replace `3001` with your chosen port.)

2. **Update the Nginx config below to match your chosen port.**

### Install Nginx
```bash
sudo apt install -y nginx
```

### Configure Nginx
Replace `yourdomain.com` with your actual domain or server IP. Also, set the port to match your app (default is 3000, change if needed):

```nginx
server {
    listen 80;
    server_name yourdomain.com;

    location / {
        proxy_pass http://localhost:3000; # Change 3000 if using a different port
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

- Save this as `/etc/nginx/sites-available/over-the-hill`
- Enable it:
  ```bash
  sudo ln -s /etc/nginx/sites-available/over-the-hill /etc/nginx/sites-enabled/
  ```
- Test the configuration
  ```bash  
  sudo nginx -t
  ```
- Enable the new configuration
  ```bash  
  sudo systemctl reload nginx
  ```
  
### (Optional) Enable HTTPS with Let's Encrypt
```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com
```

---

## 8. Updating the App
```bash
cd over-the-hill
git pull
pnpm install
pnpm build
pm2 restart over-the-hill
```

---

## 9. Troubleshooting
- Check pm2 logs: `pm2 logs over-the-hill`
- Check Nginx: `sudo journalctl -u nginx`

---

## 10. References
- [Next.js Production Deployment](https://nextjs.org/docs/deployment)
- [pm2 Documentation](https://pm2.keymetrics.io/)
- [Nginx Docs](https://nginx.org/en/docs/)

---

**Your app should now be live and production-ready!** 