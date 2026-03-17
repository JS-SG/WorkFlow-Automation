# 🚀 Workflow Automation System

A **role-based workflow automation platform** that manages approval processes across an organization.
It allows employees to submit requests and automatically routes them through a **multi-level approval chain** with real-time tracking and email notifications.

Built using **React (Vite), Node.js, Express, SQLite3**, and **Resend API** for notifications.

---

# 🌐 Live Demo

**Application:**
[https://workflow-agent-pi.vercel.app/login](https://workflow-agent-pi.vercel.app/login)

**Demo Video:**
[https://drive.google.com/file/d/1nK-4v5UvcW2AllbU5w2l9Kw1tFCU5EKp/view?usp=sharing](https://drive.google.com/file/d/1nK-4v5UvcW2AllbU5w2l9Kw1tFCU5EKp/view?usp=sharing)

---

# 🛠 Tech Stack

### Frontend

* React
* Vite
* JavaScript
* CSS

### Backend

* Node.js
* Express.js

### Database

* SQLite3

### Notifications

* Resend Email API

### Deployment

* Vercel

---

# ⚙️ Approval Flow

The workflow follows a structured **approval hierarchy**.

Employee → Department Head → Manager → CEO → Completed

### Process Overview

👤 **Employee**
Submits workflow request

⬇

🏢 **Department Head**
First level approval

⬇

👔 **Manager**
Second level approval

⬇

👑 **CEO**
Final approval

⬇

✅ **Workflow Completed**

---

# ⚡ Smart Routing (Dynamic Skipping)

The system automatically skips unnecessary approval levels depending on who starts the workflow.

Example rules:

* If a **Manager starts the workflow**, the **Department Head step is skipped**.
* If the **CEO starts the workflow**, it **automatically completes**.

This ensures **faster processing and minimal delays**.

---

👨‍💻 User Roles & Responsibilities

👤 Employee

### Step-by-Step Guide

1. Go to **Workflows**
2. Click **Run** on any workflow
3. Fill the required input fields
4. Click **Start Execution**
5. Track progress in the **Workflow Tracker**
6. Receive updates through **Notifications**

### ✅ Can Do

* Submit workflow requests
* Track submitted workflows
* View notifications
* View request history

### 🔒 Cannot Do

* Approve requests
* Edit workflows
* View other users' requests

---

# 🏢 Department Head

### Step-by-Step Guide

1. Open **Pending Approvals**
2. View requests from **employees in your department**
3. Click **Review & Act**
4. Add optional notes
5. Click **Approve** or **Reject**

### ✅ Can Do

* Review department requests
* Approve or reject workflows
* Escalate approved requests to **Manager**

### 🔒 Cannot Do

* View other department requests
* See Manager or CEO steps
* Edit workflows

---

# 👔 Manager

### Step-by-Step Guide

1. Open **Pending Approvals**
2. View requests approved by **Department Head**
3. Click **Review & Act**
4. Approve or Reject

### ✅ Can Do

* Review escalated requests
* Approve or reject manager-stage requests
* Escalate approved workflows to **CEO**

### 🔒 Cannot Do

* View department head steps
* Submit workflows
* Edit workflows

---

# 👑 CEO

### Step-by-Step Guide

1. Open **Pending Approvals**
2. View requests approved by **Manager**
3. Click **Review & Act**
4. Approve or Reject

### ✅ Can Do

* Final approval authority
* View only **fully escalated workflows**
* Completing approval finishes the workflow

### 🔒 Cannot Do

* View earlier approval steps
* Submit workflows
* Edit workflows

---

# ⚙️ Admin

The **Admin role controls the workflow system**.

### Step-by-Step Guide

1. Create workflows from the **Workflows list**
2. Add steps:

   * Approval
   * Task
   * Notification
3. Assign **roles for approval steps**
4. Define routing rules
5. Execute workflows

### ✅ Can Do

* Create workflows
* Edit workflows
* Add or remove workflow steps
* Define routing rules
* View all executions
* Access audit logs

---

# 🔔 Notifications

Every action in the workflow triggers a **real-time notification**.

Users receive updates when:

* A request is submitted
* A request is approved
* A request is rejected
* The workflow moves to the next stage
* The workflow completes

Email notifications are sent using the **Resend API**.

---

# 📊 Workflow Tracker

Each execution includes a **visual status tracker** that shows:

* Current approval stage
* Completed steps
* Pending approvals
* Final workflow status

This allows users to **monitor workflow progress in real time**.

---

# ✨ Key Features

* Multi-level approval system
* Role-based access control
* Dynamic approval skipping
* Real-time workflow tracker
* Email notifications
* Audit logging
* Workflow execution history
* Admin workflow builder

---

📁 Project Structure

```
workflow-automation
│
├── frontend
│   ├── React + Vite UI
│
├── backend
│   ├── Node.js + Express API
│   ├── SQLite database
│
└── notifications
    └── Resend email integration
```

---


If you want, I can also give you a **🔥 more impressive GitHub README version (with badges, diagrams, architecture, and screenshots)** that makes the project look **much stronger for recruiters and GitHub viewers**.
