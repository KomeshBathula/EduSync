# EduSync Deployment Guide for Render

This guide will help you deploy both the frontend and backend of EduSync to Render.

## Prerequisites

- [Render Account](https://render.com) (Free tier available)
- [MongoDB Atlas Account](https://www.mongodb.com/cloud/atlas) (Free tier available)
- [Groq API Key](https://console.groq.com/keys) for AI features
- GitHub repository with your code

## Quick Deploy (Automated)

1. **Connect Your GitHub Repository to Render**
   - Go to [Render Dashboard](https://dashboard.render.com/)
   - Click "New +" → "Blueprint"
   - Connect your GitHub account and select the EduSync repository
   - Render will automatically detect the `render.yaml` file and set up both services

2. **Configure Environment Variables**
   
   After blueprint deployment, you'll need to set these environment variables:

   **Backend Service** (`edusync-backend`):
   - `MONGO_URI`: Your MongoDB Atlas connection string
   - `GROQ_API_KEY`: Your Groq API key
   - `ALLOWED_ORIGINS`: Your frontend URL (e.g., `https://edusync-frontend.onrender.com`)
   
   **Frontend Service** (`edusync-frontend`):
   - `VITE_API_URL`: Your backend URL (e.g., `https://edusync-backend.onrender.com`)

3. **Trigger Deployment**
   - Save the environment variables
   - Render will automatically build and deploy both services

---

## Manual Deploy (Step-by-Step)

### Part 1: Deploy Backend

1. **Set Up MongoDB Atlas**
   ```
   - Go to https://www.mongodb.com/cloud/atlas
   - Create a free cluster
   - Create a database user with password
   - Whitelist all IPs (0.0.0.0/0) for Render access
   - Get your connection string (looks like):
     mongodb+srv://username:password@cluster.mongodb.net/edusync-ai
   ```

2. **Create Backend Web Service on Render**
   - Go to Render Dashboard → "New +" → "Web Service"
   - Connect your GitHub repository
   - Configure:
     - **Name**: `edusync-backend`
     - **Region**: Oregon (US West) or closest to you
     - **Branch**: `main`
     - **Root Directory**: `server`
     - **Runtime**: Node
     - **Build Command**: `npm install`
     - **Start Command**: `npm start`
     - **Plan**: Free

3. **Add Backend Environment Variables**
   
   In the Render dashboard, go to Environment tab and add:
   
   ```env
   NODE_ENV=production
   PORT=5000
   MONGO_URI=mongodb+srv://your-connection-string-here
   JWT_SECRET=generate-a-random-32-char-secret-here
   GROQ_API_KEY=your-groq-api-key-here
   ALLOWED_ORIGINS=https://edusync-frontend.onrender.com
   ENABLE_ML=true
   MODEL_VERSION=v1
   ML_CONFIDENCE_THRESHOLD=0.65
   STRICT_EXAM_MODE=true
   ```

   **Important**: 
   - Replace `MONGO_URI` with your actual MongoDB Atlas connection string
   - Replace `GROQ_API_KEY` with your Groq API key
   - Update `ALLOWED_ORIGINS` after you deploy frontend (use your actual frontend URL)
   - Generate a strong `JWT_SECRET` using: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`

4. **Deploy Backend**
   - Click "Create Web Service"
   - Wait for deployment (5-10 minutes)
   - Note your backend URL (e.g., `https://edusync-backend.onrender.com`)

### Part 2: Deploy Frontend

1. **Create Frontend Static Site on Render**
   - Go to Render Dashboard → "New +" → "Static Site"
   - Connect your GitHub repository
   - Configure:
     - **Name**: `edusync-frontend`
     - **Region**: Same as backend
     - **Branch**: `main`
     - **Root Directory**: `client`
     - **Build Command**: `npm install && npm run build`
     - **Publish Directory**: `dist`
     - **Plan**: Free

2. **Add Frontend Environment Variable**
   
   In the Render dashboard, go to Environment tab and add:
   
   ```env
   VITE_API_URL=https://edusync-backend.onrender.com
   ```
   
   **Important**: Use your actual backend URL from Part 1, Step 4

3. **Deploy Frontend**
   - Click "Create Static Site"
   - Wait for deployment (3-5 minutes)
   - Note your frontend URL (e.g., `https://edusync-frontend.onrender.com`)

### Part 3: Update Backend CORS

1. **Update Backend Environment Variables**
   - Go back to your backend service on Render
   - Update `ALLOWED_ORIGINS` with your frontend URL:
     ```
     ALLOWED_ORIGINS=https://edusync-frontend.onrender.com
     ```
   - Save changes
   - Render will automatically redeploy the backend

### Part 4: Seed Initial Data (Optional)

If you need to seed admin/test accounts:

1. **Connect to Your Backend**
   - Go to your backend service on Render
   - Click "Shell" tab
   - Run: `npm run seed` (if you have a seed script)
   
   Or use the Render Shell to create an admin user manually using Node REPL.

---

## Testing Your Deployment

1. **Check Backend Health**
   ```bash
   curl https://edusync-backend.onrender.com/api/health
   ```
   Should return: `{"status":"ok"}`

2. **Visit Frontend**
   - Open your frontend URL in a browser
   - Try logging in with test credentials
   - Verify all features work

3. **Check Logs**
   - Backend logs: Render Dashboard → Backend Service → Logs
   - Frontend logs: Render Dashboard → Frontend Service → Logs

---

## Environment Variables Reference

### Backend Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `MONGO_URI` | MongoDB connection string | `mongodb+srv://user:pass@cluster.mongodb.net/edusync-ai` |
| `JWT_SECRET` | Secret key for JWT tokens | `a1b2c3d4e5f6...` (32+ chars) |
| `GROQ_API_KEY` | API key for AI features | `gsk_...` |
| `ALLOWED_ORIGINS` | Frontend URL for CORS | `https://edusync-frontend.onrender.com` |

### Backend Optional Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | `5000` |
| `ENABLE_ML` | Enable ML features | `true` |
| `STRICT_EXAM_MODE` | Exam security mode | `true` |

### Frontend Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `VITE_API_URL` | Backend API URL | `https://edusync-backend.onrender.com` |

---

## Troubleshooting

### Backend Issues

**Problem**: Service won't start
- Check Render logs for error messages
- Verify all required environment variables are set
- Ensure MongoDB Atlas allows connections from all IPs (0.0.0.0/0)
- Check MongoDB connection string format

**Problem**: CORS errors in browser
- Verify `ALLOWED_ORIGINS` includes your frontend URL (no trailing slash)
- Ensure frontend URL matches exactly (http vs https)
- Clear browser cache and try again

**Problem**: AI features not working
- Verify `GROQ_API_KEY` is set correctly
- Check Groq API quota/limits
- Check backend logs for AI service errors

### Frontend Issues

**Problem**: Can't connect to backend
- Verify `VITE_API_URL` is set correctly (no trailing slash)
- Check if backend is running (visit `/api/health`)
- Verify backend CORS allows your frontend domain

**Problem**: Build fails
- Check Node version (should be 18+)
- Clear npm cache: `npm cache clean --force`
- Delete `node_modules` and reinstall

### Database Issues

**Problem**: Can't connect to MongoDB
- Verify connection string format
- Check database user credentials
- Ensure IP whitelist includes 0.0.0.0/0
- Test connection string locally first

---

## Free Tier Limitations

**Render Free Tier**:
- Services spin down after 15 minutes of inactivity
- First request after inactivity may take 30-60 seconds (cold start)
- 750 hours/month of runtime (enough for 1 service 24/7)
- Limited bandwidth

**MongoDB Atlas Free Tier** (M0):
- 512 MB storage
- Limited to 100 connections
- Shared cluster (slower performance)

**Recommendations**:
- Upgrade to paid tier for production use
- Keep services active with uptime monitors (e.g., UptimeRobot)
- Optimize database queries to reduce connection usage

---

## Updating Your Deployment

**Automatic Deployments**:
- Render auto-deploys when you push to the connected GitHub branch
- Changes to `render.yaml` require manual sync

**Manual Deployments**:
- Go to service dashboard → "Manual Deploy" → "Deploy latest commit"

**Rollback**:
- Go to service dashboard → "Deploys" → Select previous deploy → "Rollback to this version"

---

## Security Checklist

- ✅ Use strong, randomly generated `JWT_SECRET`
- ✅ Use MongoDB Atlas (not local MongoDB)
- ✅ Keep `GROQ_API_KEY` secret
- ✅ Set `NODE_ENV=production` in backend
- ✅ Use HTTPS URLs (Render provides this automatically)
- ✅ Limit `ALLOWED_ORIGINS` to your actual frontend domain
- ✅ Never commit `.env` files to GitHub
- ✅ Rotate secrets regularly
- ✅ Monitor API usage and costs

---

## Support

- **Render Docs**: https://render.com/docs
- **MongoDB Atlas Docs**: https://docs.atlas.mongodb.com/
- **EduSync GitHub**: https://github.com/RAMTEJA87/EduSync

---

## Quick Command Reference

```bash
# Generate JWT Secret
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Test Backend Locally
cd server && npm install && npm start

# Test Frontend Locally
cd client && npm install && npm run dev

# Build Frontend for Production
cd client && npm run build

# Run Backend Tests
cd server && npm test
```

---

**Deployment Complete!** 🎉

Your EduSync platform should now be live on Render. Share your frontend URL with users to access the platform.
