# Deployment Guide: Render (Backend) + Vercel (Frontend)

This guide provides step-by-step instructions for hosting the **College Course Prerequisite Explorer** application across **Render.com** (Node.js/Express API backend) and **Vercel** (React/Vite static frontend).

---

## 1. Prerequisites & Database Setup

1. **CognoDB Instance**: Ensure your CognoDB graph database instance is running.
   - Database URI: `bolt+s://db-b0c4bfc2.bravo.databases.cognodb.com` (or your assigned URI)
   - Password: Your CognoDB password

2. **GitHub Repository**: All changes in this project have been prepared and committed to:
   - `https://github.com/Ak-assh/College_course_prerequisite_explorer.git`

---

## 2. Deploy Backend on Render (Render.com)

1. Log in to [Render Dashboard](https://dashboard.render.com/).
2. Click **New +** -> **Web Service**.
3. Connect your GitHub repository `Ak-assh/College_course_prerequisite_explorer`.
4. Configure the Web Service settings:
   - **Name**: `college-course-explorer-api` (or any unique name)
   - **Region**: Select closest region (e.g. Oregon / Frankfurt)
   - **Branch**: `main` (or `master`)
   - **Root Directory**: Leave blank (root `./`)
   - **Runtime**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `node server/index.js`
   - **Instance Type**: Free

5. Add **Environment Variables** in the Render Dashboard:
   | Key | Value | Notes |
   |---|---|---|
   | `NODE_ENV` | `production` | Production environment mode |
   | `NEO4J_URI` | `bolt+s://db-b0c4bfc2.bravo.databases.cognodb.com` | Your CognoDB URI |
   | `NEO4J_PASSWORD` | `YOUR_COGNODB_PASSWORD` | Your CognoDB password |
   | `NEO4J_USER` | `cognodb` | CognoDB username |
   | `FRONTEND_URL` | `https://your-app.vercel.app` | Your Vercel frontend URL (set after Vercel deploy) |

6. Click **Create Web Service**.
7. Wait for deployment to complete. Copy your Render service URL (e.g., `https://college-course-explorer-api.onrender.com`).
8. Verify health check by visiting `https://college-course-explorer-api.onrender.com/api/health`.

---

## 3. Deploy Frontend on Vercel (Vercel.com)

1. Log in to [Vercel Dashboard](https://vercel.com/dashboard).
2. Click **Add New...** -> **Project**.
3. Import the repository `Ak-assh/College_course_prerequisite_explorer`.
4. Configure Project Settings:
   - **Framework Preset**: `Vite`
   - **Root Directory**: Select `client` (Click Edit next to Root Directory and pick `client`)
   - **Build Command**: `npm run build` (auto-detected)
   - **Output Directory**: `dist` (auto-detected)

5. Expand **Environment Variables** and add:
   | Key | Value |
   |---|---|
   | `VITE_API_URL` | `https://college-course-prerequisite-explorer.onrender.com` |

6. Click **Deploy**.
7. Once deployed, copy your production Vercel URL (e.g., `https://college-course-prerequisite-explorer.vercel.app`).

---

## 4. Final Link & Verification

1. Go back to your **Render Dashboard** -> Web Service -> **Environment Variables**.
2. Update `FRONTEND_URL` to your live Vercel URL (e.g., `https://college-course-prerequisite-explorer.vercel.app`).
3. Save changes (Render will automatically re-deploy with updated CORS settings).
4. Open your live Vercel URL in your browser and test:
   - Interactive Course Graph rendering
   - Prerequisite Explorer search
   - Eligibility Checker
   - Learning Path Planner
   - Degree Map progress overlay

---

## Troubleshooting

- **CORS Error on Frontend**: Ensure `FRONTEND_URL` in Render environment matches your Vercel URL without trailing slash.
- **Database 503 Error**: Verify `NEO4J_URI` and `NEO4J_PASSWORD` in Render dashboard environment variables match your CognoDB instance.
- **API Health Check**: Access `/api/health` directly on Render URL to verify backend is up.
