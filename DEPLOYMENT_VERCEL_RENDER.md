# 🚀 Deployment Guide: Vercel (Frontend) + Render (Backend)

This guide covers deploying EduSync with:
- **Frontend**: Vercel (React + Vite)
- **Backend**: Render (Node.js + Express)
- **Database**: MongoDB Atlas

---

## Prerequisites

- [Vercel Account](https://vercel.com) (Free tier available)
- [Render Account](https://render.com) (Free tier available)
- [MongoDB Atlas Account](https://www.mongodb.com/cloud/atlas) (Free tier available)
- [Groq API Key](https://console.groq.com/keys) for AI features
- GitHub repository with your code

---

## Part 1: Deploy Backend to Render

### Step 1: Set Up MongoDB Atlas

1. Go to https://www.mongodb.com/cloud/atlas
2. Create a free M0 cluster (select your nearest region)
3. **Database Access**: Create a database user
   - Username: `edusync-admin` (or your choice)
   - Password: Generate a strong password and save it
4. **Network Access**: Whitelist all IPs for cloud deployment
   - Click "Add IP Address"
   - Click "Allow Access from Anywhere" → `0.0.0.0/0`
   - Confirm
5. **Get Connection String**:
   - Click "Connect" on your cluster
   - Choose "Connect your application"
   - Copy the connection string (looks like):
     ```
     mongodb+srv://edusync-admin:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
     ```
   - Replace `<password>` with your actual password
   - Add database name: `mongodb+srv://edusync-admin:<password>@cluster0.xxxxx.mongodb.net/edusync-ai?retryWrites=true&w=majority`

### Step 2: Deploy Backend on Render

#### Option A: Using Blueprint (Recommended)

1. Go to [Render Dashboard](https://dashboard.render.com/)
2. Click **"New +" → "Blueprint"**
3. Connect your GitHub repository (`RAMTEJA87/EduSync`)
4. Render will detect `render.yaml` and configure the backend automatically
5. Click **"Apply"**

#### Option B: Manual Deployment

1. Go to [Render Dashboard](https://dashboard.render.com/)
2. Click **"New +" → "Web Service"**
3. Connect your GitHub repository
4. Configure service:
   - **Name**: `edusync-backend`
   - **Region**: Oregon (US West) or closest to you
   - **Branch**: `main`
   - **Root Directory**: `server`
   - **Runtime**: Node
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Plan**: Free

### Step 3: Configure Backend Environment Variables

In Render dashboard, go to your service → **Environment** tab → Add:

```env
NODE_ENV=production
PORT=5000
MONGO_URI=mongodb+srv://your-username:your-password@cluster0.xxxxx.mongodb.net/edusync-ai?retryWrites=true&w=majority
JWT_SECRET=your-generated-secret-here
GROQ_API_KEY=gsk_your-groq-api-key-here
ALLOWED_ORIGINS=https://edusync.vercel.app
ENABLE_ML=true
MODEL_VERSION=v1
ML_CONFIDENCE_THRESHOLD=0.65
STRICT_EXAM_MODE=true
```

**Important Notes**:
- **MONGO_URI**: Use your actual MongoDB Atlas connection string
- **JWT_SECRET**: Generate using: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
- **GROQ_API_KEY**: Get from https://console.groq.com/keys
- **ALLOWED_ORIGINS**: Update after you deploy frontend (will be your Vercel URL)

### Step 4: Get Backend URL

Once deployed (takes 5-10 minutes), note your backend URL:
- Format: `https://edusync-backend.onrender.com`
- Or: `https://edusync-backend-xxxx.onrender.com`

**Important**: Keep this URL handy for frontend deployment!

---

## Part 2: Deploy Frontend to Vercel

### Step 1: Prepare for Deployment

Your frontend is already configured with:
- ✅ `vercel.json` (SPA routing)
- ✅ `.env.example` (environment template)
- ✅ Build scripts in `package.json`

### Step 2: Deploy to Vercel

#### Option A: Using Vercel CLI (Fastest)

```bash
# Install Vercel CLI globally
npm install -g vercel

# Navigate to client directory
cd client

# Login to Vercel
vercel login

# Deploy (production)
vercel --prod
```

Follow prompts:
- **Set up and deploy**: Yes
- **Project name**: `edusync` (or your choice)
- **Root directory**: `.` (current directory)
- **Override settings**: No (auto-detects Vite)

#### Option B: Using Vercel Dashboard (Recommended for Beginners)

1. Go to [Vercel Dashboard](https://vercel.com/new)
2. Click **"Import Project"** or **"Add New" → "Project"**
3. Connect your GitHub repository (`RAMTEJA87/EduSync`)
4. Configure project:
   - **Framework Preset**: Vite (auto-detected)
   - **Root Directory**: `client`
   - **Build Command**: `npm run build` (auto-detected)
   - **Output Directory**: `dist` (auto-detected)
   - **Install Command**: `npm install` (auto-detected)

### Step 3: Configure Frontend Environment Variables

In Vercel dashboard → Your Project → **Settings** → **Environment Variables**:

Add this variable:

| Name | Value | Environment |
|------|-------|-------------|
| `VITE_API_URL` | `https://edusync-backend.onrender.com` | Production, Preview, Development |

**Important**: Replace `https://edusync-backend.onrender.com` with your actual Render backend URL from Part 1, Step 4.

### Step 4: Redeploy (If Already Deployed)

If you added environment variables after initial deployment:
1. Go to **Deployments** tab
2. Click on the latest deployment
3. Click **"Redeploy"** → **"Use existing Build Cache"** → **"Redeploy"**

Or trigger automatic redeploy:
```bash
git commit --allow-empty -m "Trigger Vercel redeploy"
git push origin main
```

### Step 5: Get Frontend URL

Once deployed, note your frontend URL:
- Format: `https://edusync.vercel.app`
- Or: `https://edusync-xxxx.vercel.app`

---

## Part 3: Update Backend CORS

### Important: Update ALLOWED_ORIGINS on Render

1. Go back to your **Render Backend Service**
2. Navigate to **Environment** tab
3. Update `ALLOWED_ORIGINS` with your Vercel URL:
   ```
   ALLOWED_ORIGINS=https://edusync.vercel.app
   ```
4. **Save Changes** (Render will automatically redeploy)

**Note**: Use your actual Vercel URL (no trailing slash).

---

## Part 4: Testing Your Deployment

### Test Backend Health

```bash
curl https://edusync-backend.onrender.com/api/health
```

Expected response:
```json
{"status":"ok"}
```

### Test Frontend

1. Open your Vercel URL in a browser: `https://edusync.vercel.app`
2. Try logging in with test credentials (if seeded)
3. Check browser console for:
   - ❌ CORS errors → Update `ALLOWED_ORIGINS` on Render
   - ❌ 404 errors → Check `VITE_API_URL` on Vercel
   - ✅ Successful API calls → Everything works!

### Common Issues & Solutions

**Problem**: CORS Error
```
Access to XMLHttpRequest blocked by CORS policy
```
**Solution**: Update `ALLOWED_ORIGINS` on Render backend to include your Vercel frontend URL.

---

**Problem**: Backend shows "Cannot connect to MongoDB"
**Solution**: 
- Check MongoDB Atlas connection string
- Verify IP whitelist includes `0.0.0.0/0`
- Check database user credentials

---

**Problem**: Frontend can't reach backend (404)
**Solution**: 
- Verify `VITE_API_URL` is set correctly on Vercel
- Ensure backend is deployed and running on Render
- Check backend URL matches exactly (no trailing slash)

---

**Problem**: Render backend cold starts (slow first request)
**Solution**: 
- Normal on free tier (services sleep after 15 min inactivity)
- First request takes 30-60 seconds
- Consider using uptime monitor (e.g., UptimeRobot, Cron-job.org)

---

## Part 5: Optional - Seed Database

If you need sample data for testing:

### Option 1: Using Render Shell

1. Go to Render dashboard → Your backend service
2. Click **"Shell"** tab (top right)
3. Run:
   ```bash
   node seed.js
   ```

### Option 2: Locally with Production Database

```bash
# Temporarily set production MongoDB URI
export MONGO_URI="mongodb+srv://your-connection-string"

# Run seed script locally
cd server
node seed.js
```

This creates:
- Admin account: `admin@edusync.com` / `Admin@123`
- Sample students, teachers, quizzes, and results

---

## Environment Variables Reference

### Backend (Render) - Required

| Variable | Description | Example |
|----------|-------------|---------|
| `MONGO_URI` | MongoDB Atlas connection string | `mongodb+srv://user:pass@cluster.mongodb.net/edusync-ai` |
| `JWT_SECRET` | Secret for JWT tokens (32+ chars) | `a1b2c3d4e5f6...` |
| `GROQ_API_KEY` | API key for AI features | `gsk_xxxxxxxxxxxxx` |
| `ALLOWED_ORIGINS` | Frontend URL for CORS | `https://edusync.vercel.app` |

### Backend (Render) - Optional

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port (Render sets automatically) | `5000` |
| `NODE_ENV` | Environment mode | `production` |
| `ENABLE_ML` | Enable ML risk prediction | `true` |
| `STRICT_EXAM_MODE` | Exam security mode | `true` |

### Frontend (Vercel) - Required

| Variable | Description | Example |
|----------|-------------|---------|
| `VITE_API_URL` | Backend API URL (no trailing slash) | `https://edusync-backend.onrender.com` |

---

## Deployment Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         USERS                               │
└────────────────────────┬────────────────────────────────────┘
                         │
           ┌─────────────┴─────────────┐
           │                           │
           ▼                           ▼
    ┌─────────────┐            ┌─────────────┐
    │   VERCEL    │            │   RENDER    │
    │  (Frontend) │───────────▶│  (Backend)  │
    │             │   API      │             │
    │ React+Vite  │  Calls     │  Node.js    │
    └─────────────┘            └──────┬──────┘
                                      │
                                      ▼
                              ┌───────────────┐
                              │ MongoDB Atlas │
                              │  (Database)   │
                              └───────────────┘
```

**Data Flow**:
1. User visits `https://edusync.vercel.app` (Vercel serves React app)
2. React app makes API calls to `https://edusync-backend.onrender.com`
3. Backend validates JWT, processes request, queries MongoDB Atlas
4. Response flows back through backend → frontend → user

---

## Updating Your Deployment

### Auto-Deploy on Git Push

Both Vercel and Render automatically redeploy when you push to `main` branch:

```bash
git add .
git commit -m "Your changes"
git push origin main
```

- **Vercel**: Redeploys frontend automatically (~2-3 min)
- **Render**: Redeploys backend automatically (~5-10 min)

### Manual Redeploy

**Vercel**:
1. Dashboard → Your Project → Deployments
2. Click latest deployment → "Redeploy"

**Render**:
1. Dashboard → Your Service → Manual Deploy
2. Click "Deploy latest commit"

### Rollback

**Vercel**:
1. Deployments tab → Select previous successful deployment
2. Click "Promote to Production"

**Render**:
1. Deploys tab → Select previous deployment
2. Click "Rollback to this version"

---

## Free Tier Limitations

### Vercel Free Tier
- 100 GB bandwidth/month
- Unlimited deployments
- Automatic HTTPS
- Global CDN
- **Perfect for frontend!** ✅

### Render Free Tier
- Services spin down after 15 min inactivity
- First request after sleep: 30-60 sec cold start
- 750 hours/month runtime (enough for 1 service 24/7)
- 100 GB bandwidth/month
- **Good for development/demos** ⚠️

### MongoDB Atlas Free Tier (M0)
- 512 MB storage
- Shared cluster
- 100 max connections
- **Sufficient for learning/small apps** ✅

### Production Recommendations
- **Vercel**: Upgrade to Pro ($20/mo) for team features
- **Render**: Upgrade to Starter ($7/mo) for always-on service
- **MongoDB**: Upgrade to M10 ($0.08/hr) for dedicated cluster

---

## Security Checklist

Before going to production:

- ✅ Use strong, randomly generated `JWT_SECRET` (32+ chars)
- ✅ Use MongoDB Atlas (not local MongoDB)
- ✅ Keep `GROQ_API_KEY` secret (never commit to Git)
- ✅ Set `NODE_ENV=production` on backend
- ✅ Limit `ALLOWED_ORIGINS` to actual frontend domain only
- ✅ Never commit `.env` files to GitHub
- ✅ Enable MongoDB Atlas IP whitelist (0.0.0.0/0 for cloud deployments)
- ✅ Rotate secrets regularly
- ✅ Monitor API usage and costs
- ✅ Use HTTPS everywhere (both platforms provide this automatically)

---

## Troubleshooting Commands

### Check Backend Health
```bash
curl https://edusync-backend.onrender.com/api/health
```

### Check Frontend Build Locally
```bash
cd client
npm run build
npm run preview
```

### Test Backend Locally with Production DB
```bash
cd server
export MONGO_URI="your-production-mongodb-uri"
npm start
```

### Generate New JWT Secret
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Check Vercel Logs
```bash
vercel logs
```

---

## Support & Resources

- **Vercel Docs**: https://vercel.com/docs
- **Render Docs**: https://render.com/docs
- **MongoDB Atlas Docs**: https://docs.atlas.mongodb.com/
- **Vite Docs**: https://vitejs.dev/
- **EduSync GitHub**: https://github.com/RAMTEJA87/EduSync

---

## Quick Reference

### Backend URLs
- **Health Check**: `/api/health`
- **Login**: `POST /api/auth/login/{role}`
- **Student Dashboard**: `GET /api/student/dashboard`

### Default Test Credentials (After Seeding)
- **Admin**: `admin@edusync.com` / `Admin@123`
- **Teacher**: `teacher1@edusync.com` / `Teacher@123`
- **Student**: `student1@edusync.com` / `Student@123`

---

**Deployment Complete!** 🎉

Your EduSync platform is now live with:
- ✅ Frontend hosted on Vercel (Lightning-fast global CDN)
- ✅ Backend hosted on Render (Reliable Node.js hosting)
- ✅ Database on MongoDB Atlas (Scalable cloud database)

Share your Vercel URL with users to access the platform!
