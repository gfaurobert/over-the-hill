# Production Deployment Guide for TIM Application

This comprehensive guide covers the complete deployment of the TIM application and Supabase backend on an Ubuntu server, including security configuration, SSL setup, and ongoing management.

## 🚀 Quick Start

```bash
# Clone directly to the $HOME
sudo git clone https://github.com/gfaurobert/tim.git
cd tim
```

## 📋 Prerequisites

- Ubuntu 20.04+ server
- 2 Domain names pointing to your server (for the Tim App and for the Tim Supabase Studio)
- SSH access with sudo privileges
- Git repository with your application code

## 🔧 Dynamic Port Assignment

If you want to run multiple nodeJS app with the Supabase backend on the same server, you will have to find and assigned specific ports to avoid conflicting with your already deployed app

This is the list of ports you'll need to find and assign in your .env file

- NEXTJS_APP_PORT
- STUDIO_PORT
- DB_PORT
- API_PORT
- ANALYTICS_PORT
- INBUCKET_PORT

Run the following script to find and add those env variable to your .env file

```shell
./deploy/freePorts.sh
```
The script will list used ports and will find the 6 sequential number greater than 3000 and assign it to the variables listed above and copy them to your .env file. You will be prompt if the vars exist already in your .env file to avoid abusive overwrites.

```env
## Ports
NEXTJS_APP_PORT=3002
STUDIO_PORT=3003
DB_PORT=3004
API_PORT=3005
ANALYTICS_PORT=3006
INBUCKET_PORT=3007
```

## 🛠️ Detailed Installation Steps
### When needed to reset

```shell
# Stop any running Supabase containers
supabase stop

# Remove Supabase containers and volumes (if they exist)
docker ps -a | grep supabase | awk '{print $1}' | xargs -r docker rm -f
docker volume ls | grep supabase | awk '{print $2}' | xargs -r docker volume rm

```

### 1. System Preparation

```bash
# Update system packages
sudo apt update && sudo apt upgrade -y

# Install essential packages
sudo apt install -y curl wget git unzip software-properties-common
```

### 2. Node.js Installation

```bash
# Install Node.js LTS
sudo apt install nodejs npm  

# Verify installation
node --version
npm --version
```

### 3. Docker Installation

```bash
# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Add user to docker group
sudo usermod -aG docker $USER

# Verify installation
docker --version
```

### 4. Nginx Installation

```bash
# Install Nginx
sudo apt install -y nginx

# Start and enable Nginx
sudo systemctl start nginx
sudo systemctl enable nginx
```

### 5. PM2 Installation

```bash
# Install PM2 globally
sudo npm install -g pm2

# Verify installation
pm2 --version
```

### 6. Supabase CLI Installation

```bash
# Install Homebrew
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
# Install Supabase CLI using Homebrew
brew install supabase/tap/supabase

# Verify installation
supabase --version
```

### 7. Certbot Installation

```bash
# Install Certbot for SSL certificates
sudo snap install --classic certbot
sudo ln -s /snap/bin/certbot /usr/bin/certbot

# Verify installation
certbot --version
```

## 🔐 Security Configuration

### **Critical: Replace Default Secrets**

Supabase comes with default secrets that **MUST** be changed for production:

```bash
 # Store secrets securely
echo "JWT_SECRET=$(openssl rand -base64 32)" >> .env
echo "POSTGRES_PASSWORD=$(openssl rand -base64 32)" >> .env
```

With Supabase CLI, we cannot define the Studio Username and Password, so we'll use NGINX and htpassword
There is a dedicated script that will prompt the user to provide a username and a password and will generate the .htpasswd

```bash
./deploy/setup-studio-auth.sh
```

Add you OpenAI API Key to use the AI Assitant in the Supabase Studio

```bash
echo "OPEN_AI_KEY=you-open-ai-key" >> .env
```

Add the Following variables into the .env file

When using NGINX as a proxy API, SITE and NEXT_PUBLIC_SUPABASE urls can be your main domain app

```bash
PROJECT_ID=you-project-id
API_URL=https://your.app.com
SITE_URL=https://your.app.com
NEXT_PUBLIC_SUPABASE_URL=https://your.app.com
```

Some of the env variables defines until now needs to be rera din the supabase config.toml

I recommend using the "env()" function in the config.toml. This way, your config.toml does not contain any secrets that you could inadvertently commit to a git repository.

See below the config.toml extract to edit

```toml
project_id = "env(PROJECT_ID)"

[api]
# Port to use for the API URL.
port = "env(API_PORT)"

[studio]
enabled = true
# Port to use for Supabase Studio.
port = "env(STUDIO_PORT)"
# External URL of the API server that frontend connects to.
api_url = "env(API_URL)"

[auth]
enabled = true
# The base URL of your website. Used as an allow-list for redirects and for constructing URLs used
# in emails.
site_url = "env(SITE_URL)"
# A list of *exact* URLs that auth providers are permitted to redirect to post authentication.
additional_redirect_urls = [
    "env(SITE_URL)",
    "env(SITE_URL)/auth/callback",
    "env(SITE_URL)/auth/confirm",
    "env(SITE_URL)/auth/reset-password",
    "http://127.0.0.1:env(NEXTJS_APP_PORT)",
    "http://localhost:env(NEXTJS_APP_PORT)"
]
# How long tokens are valid for, in seconds. Defaults to 3600 (1 hour), maximum 604,800 (1 week).
jwt_expiry = 3600
# JWT secret - consolidated from .env.supabase
jwt_secret = "env(JWT_SECRET)"

[db]
# Port to use for the local database URL.
port = "env(DB_PORT)"

[analytics]
enabled = true
port = "env(ANALYTICS_PORT)"

[inbucket]
enabled = true
# Port to use for the email testing server web interface.
port = "env(INBUCKET_PORT)"
```

## 🗄️ Supabase Backend Setup

### **Using Supabase CLI (Recommended)**

```bash
# Navigate to application directory
cd $HOME/tim

# Initialize Supabase project
supabase init

# Start Supabase services
supabase start

# Get ANON_KEY to .env
echo "NEXT_PUBLIC_SUPABASE_ANON_KEY=$(supabase status --output json | jq -r '.ANON_KEY')" >> .env

```

## 🌐 Frontend Application Setup



### **Build and Deploy**

```bash
# Install dependencies
pnpm install

# Build application
pnpm build
# Configure PM2
cat > ecosystem.config.js << EOF
module.exports = {
  apps: [{
    name: 'tim',
    script: 'pnpm',
    args: 'start',
    cwd: '$HOME/tim',
    env: {
      NODE_ENV: 'production',
      PORT: ${NEXTJS_APP_PORT}
    },
    // instances: 'max', // 10 instance
    // exec_mode: 'cluster', // Load Balancing cluster
    instances: 1,  // Single instance
    exec_mode: 'fork',  // Single process
    autorestart: true,
    watch: false,
    max_memory_restart: '1G'
  }]
}
EOF

# Start with PM2
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

## 🔧 Nginx Configuration

Create NGINX conf file in /etc/nginx/sites-enabled/

### **Main Application Proxy**

```nginx
server {
        server_name tim.faurobert.fr;

        # Security headers
        add_header X-Frame-Options "SAMEORIGIN" always;
        add_header X-XSS-Protection "1; mode=block" always;
        add_header X-Content-Type-Options "nosniff" always;
        add_header Referrer-Policy "no-referrer-when-downgrade" always;
        add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;


        # Main application
        location / {
            proxy_pass http://localhost:$NEXTJS_APP_PORT;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_cache_bypass $http_upgrade;
        }


        # Supabase API (all Supabase endpoints go through the main API)
        location /rest/v1/ {
            proxy_pass http://localhost:$API_PORT/rest/v1/;
            proxy_http_version 1.1;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }

        # Supabase Auth endpoints
        location /auth/v1/ {
            proxy_pass http://localhost:$API_PORT/auth/v1/;
            proxy_http_version 1.1;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }

        # Supabase Storage endpoints
        location /storage/v1/ {
            proxy_pass http://localhost:$API_PORT/storage/v1/;
            proxy_http_version 1.1;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }

        # Supabase Realtime endpoints
        location /realtime/v1/ {
            proxy_pass http://localhost:$API_PORT/realtime/v1/;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection "upgrade";
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }
}
```

### **Supabase Studio Proxy**

```nginx
server {
    server_name db.tim.faurobert.fr;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;

    # Supabase Studio
    location / {
        # Basic authentication
        auth_basic "Supabase Studio";
        auth_basic_user_file /etc/nginx/.htpasswd;
        proxy_pass http://localhost:$STUDIO_PORT;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

}
```

### **Test Sites**

```bash
# Test configuration
sudo nginx -t

# Restart Nginx
sudo systemctl restart nginx
```

## 🔒 SSL Certificate Setup

### **Let's Encrypt Certificate**

```bash
# Get SSL certificate
sudo certbot --nginx

# Verify certificate
sudo certbot certificates
```

## 🗄️ Database Migration

```bash
# Run database migrations
supabase db reset

# Verify database setup
supabase status
```

## ✅ Validation and Testing

### **Post-Deployment Checklist**

- [ ] **Application Access**: `https://tim.faurobert.fr`
- [ ] **Supabase Studio**: `https://db.tim.faurobert.fr`
- [ ] **SSL Certificate**: Valid and working
- [ ] **Database Connection**: Application can connect to Supabase
- [ ] **Authentication**: User login/logout works
- [ ] **API Endpoints**: All Supabase APIs accessible
- [ ] **Security**: No default secrets in use
- [ ] **Backups**: Automated backup working
- [ ] **Monitoring**: PM2 and Nginx status healthy

### **Testing Commands**

```bash
# Check application status
pm2 status

# Check Supabase status
supabase status

# Check Nginx status
sudo systemctl status nginx

# Check SSL certificate
sudo certbot certificates


# View application logs
pm2 logs tim

# View Supabase logs
supabase logs
```