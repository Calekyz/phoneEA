# Kairon Swing Master – Self‑Activation Platform

This is a Node.js backend + frontend that allows a client to enter their MT5 credentials and start the Kairon Swing Master EA remotely, using MetaApi.

## Deploy on Render (free tier)

1. **Push this repository to GitHub**

2. **Log into [Render.com](https://render.com)** and click **New +** → **Web Service**

3. **Connect your GitHub repo** and select the branch.

4. **Configure the service:**
   - Name: `kairon-swing-master` (or any)
   - Environment: `Node`
   - Build Command: `npm install`
   - Start Command: `npm start`
   - **Add environment variables:**
     - `METAAPI_ADMIN_TOKEN` = your MetaApi admin token
     - `PORT` = `3000` (Render will override it, but keep it)

5. **Click "Create Web Service"** – Render will deploy automatically.

6. **Important – Keep the service alive**  
   Because the free tier spins down after 15 minutes of inactivity, use a free cron job (e.g., [cron-job.org](https://cron-job.org)) to ping your service URL every 10 minutes.  
   Example ping URL: `https://your-app-name.onrender.com`

7. **Share the link** with your client.  
   They will open the page, enter their MT5 credentials, and click "Activate Bot".

## How it works

- The client submits their MT5 login, password, server.
- Your backend uses MetaApi to connect to their account.
- The converted EA logic (Kairon Swing Master) runs on your server and trades on the client's account.

**Note**: This is a minimal MVP. For production, add user authentication, HTTPS (Render provides it automatically), and proper logging.
