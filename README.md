# Avatar Viseme Lip Sync with Azure Synthesizer

This project uses Azure Cognitive Services to generate speech audio and corresponding **viseme (lip sync)** data to animate an avatar in sync with the speech.

## 🚀 Features

* Text-to-Speech using Azure Speech SDK
* Lip sync animation using viseme data
* Dynamic speech input to generate real-time avatar response

---

## 🧰 Prerequisites

* [Node.js](https://nodejs.org/) installed
* Azure Cognitive Services Speech resource

---

## 📦 Step 1: Install Dependencies

Clone the repository and install required packages:

```bash
git clone https://github.com/dhavalpatelh/avatar-facial-expression
cd avatar-facial-expression
npm install
```

---

## 🔐 Step 2: Setup Azure Credentials

Update the `.env` file in the project root with the following details:

```env
VITE_APP_SPEECH_KEY=<PASTE_HERE_THE_SPEECH_KEY>
VITE_APP_SPEECH_REGION=<PASTE_HERE_THE_SPEECH_REGION>
```

> You can get these values from your Azure portal under **Speech Services**.

---

## ▶️ Step 3: Run the Project

Start the application with:

```bash
npm run dev
```

Open the application in your browser at [http://localhost:5173](http://localhost:5173)

---

## 📝 Optional Usage

You can modify the input text field and click the **"Speak"** button to:

* Dynamically synthesize new speech
* Automatically update avatar lip movements in sync


**Update**:
- **Avatar5** presents new additionals eyes movements while avatar talks
- **Experience** takes its modifications account in it.