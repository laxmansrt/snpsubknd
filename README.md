# ⚙ Server Core - SAPTHAGIRI NPS University Portal

This server acts as the primary data processing, storage, AI integration, and core infrastructure interface behind the **SAPTHAGIRI NPS University Portal backend**.

---

## 🏗️ Technology Stack

Our robust backend relies on industry-standard technologies with specialized AI augmentation integrations.

- **Environment**: Node.js & Express.js wrapper (`express`, `express-async-handler`)
- **Database**: MongoDB utilizing `mongoose` modeling.
- **Security & Validation**: 
    - `bcryptjs` - For hashing and safeguarding user credentials
    - `jsonwebtoken` - For JSON-based stateless secured authentication
    - `express-rate-limit` - DDoS protection and request throttling
    - `cors` - Configuring cross-origin setups perfectly
- **Integrations**:
    - `nodemailer` - Built internally to interact with SMTP setups for verification, notifications, and alerts.
    - `openai` / `@google/generative-ai` - AI features to boost educational insights, and automations within the user lifecycle interactions.

---

## 📋 Required Environments

Store the following config details as a `.env` in the root `/snpsubknd/` directory:

```env
PORT=...               # Preferred Dev Server Port
MONGODB_URI=...        # Your target remote/local MongoDB driver link
JWT_SECRET=...         # Strong cryptographic string
EMAIL_USER=...         # Target system SMTP configuration email target
EMAIL_PASS=...         # Standard SMTP app password
OPENAI_API_KEY=...
GOOGLE_API_KEY=...
```

---

## 🏃 Running the Backend Locally

Development environments include `nodemon` out of the box so updates mirror seamlessly across code edits to your running server dynamically:

```bash
# Standard dependency initialization
npm install

# Start development daemon (Listens up for direct edits)
npm run dev

# Starts statically
npm start
```
