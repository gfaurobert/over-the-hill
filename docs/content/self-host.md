---
title: "Self-Hosting Guide (Ubuntu)"
date: 2025-06-23
draft: false
description: "This guide will help you deploy your Next.js app (`hill-chart-generator`) on your own Ubuntu server for production use."
tags: ["getting-started", "example"]
---

## 1. Prerequisites

- **Ubuntu server** (tested on 20.04/22.04)
- **Root or sudo access**
- **Domain name** (optional, for HTTPS)

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

## 4. Build the App
```bash
pnpm build
```

---

## 5. Run the App in Production

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

## 6. (Recommended) Set Up Nginx as a Reverse Proxy

### Check if Port 3000 is in Use
By default, Next.js runs on port 3000. To check if something is already using this port:

```bash
sudo lsof -i :3000
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

## 7. Firewall (Optional but Recommended)
```bash
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw enable
```

---

## 8. Updating the App
```bash
cd hill-chart-generator
git pull
pnpm install
pnpm build
pm2 restart hill-chart-generator
```

---

## 9. Troubleshooting
- Check pm2 logs: `pm2 logs hill-chart-generator`
- Check Nginx: `sudo journalctl -u nginx`

---

## 10. References
- [Next.js Production Deployment](https://nextjs.org/docs/deployment)
- [pm2 Documentation](https://pm2.keymetrics.io/)
- [Nginx Docs](https://nginx.org/en/docs/)

---

**Your app should now be live and production-ready!** 