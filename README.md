# Secure File Manager 🗂️

A simple file upload and sharing application built with Django (backend) and React (frontend).

## Features

- **Upload Files**  📤  
  Upload your files to the app for storage and sharing.

- **Delete Files**  🗑️  
  Delete unwanted files from your collection with ease.

- **Share Internally**  🔒🤝  
  Share files securely with other users within your organization or team.

- **Share Globally with Limited Time URL**  🌍⏳  
  Generate a temporary, time-limited URL to share files globally.

- **File Preview**  👀  
  Preview your files directly in the app without the need to download them.

## Setup

1. Clone the repository:
   ```bash
   git clone https://github.com/AnshumanPadhi97/secure-file-share.git
   ```
2. Navigate into the project directory:
   ```bash
    cd secure-file-share
   ```

3. Build and start the Docker containers:
    ```bash
    docker-compose up --build
    ```

The app will be available at https://localhost

### Default Admin user
Login - admin@gmail.com 

Password - admin

## 🔐 Security Concepts Integrated

### 🛡️ Multi-Factor Authentication (MFA)

Multi-Factor Authentication (MFA) adds an extra layer of security by requiring users to provide two or more verification factors to access their accounts. Common MFA methods include:

- **Google Authenticator** 📱: A mobile app that generates time-based one-time passwords (TOTP).
- **Authy** 🔑: Similar to Google Authenticator but with backup and multi-device support.
- **Microsoft Authenticator** 🔒: Another mobile app that offers secure login using TOTP and push notifications.

These methods are part of the broader effort to secure user logins and prevent unauthorized access.

### 🌐 HTTPS & SSL/TLS

- **HTTPS** (HyperText Transfer Protocol Secure) 🛡️: Ensures secure communication over the internet by encrypting data sent between the user's browser and the server.
- **SSL/TLS** (Secure Sockets Layer/Transport Layer Security) 🔒: Cryptographic protocols that provide secure communication by encrypting data transmitted over the web.

Using HTTPS with SSL/TLS certificates ensures that data is transferred securely and cannot be intercepted by attackers.

### 🔑 bcrypt Password Hashing

**bcrypt** 🧮 is a password hashing algorithm designed to be computationally intensive to make brute-force attacks more difficult. It also provides automatic salting to further protect passwords from being compromised.

- Strong, adaptive hashing
- Protects user passwords even in the case of database breaches

### 🛡️ JWT (JSON Web Tokens)

**JWT** 🧳 is an open standard for securely transmitting information between parties as a JSON object. It's commonly used for authentication and authorization purposes.

- **Structure**: Comprised of three parts — header, payload, and signature.
- **Benefits**: Statelesness, scalability, and security.

JWT tokens are often used to authenticate users in a web application, allowing for single sign-on (SSO) and other scenarios.

### 📂 File Encryption

**File encryption** 🔒 ensures that sensitive data stored in files is protected by converting it into an unreadable format unless the decryption key is provided. This is especially important for storing personal information, financial data, and other confidential files.

### Common File Encryption Methods:
- **AES** (Advanced Encryption Standard) 🔑
- **RSA** 🏰 (used for public/private key encryption)

### Why Use File Encryption?
- Protects against unauthorized access
- Prevents data breaches if files are exposed or stolen

---

> "Security is not a product, but a process." - Bruce Schneier

## Libraries Used

### Backend:

- Django
- django-cors-headers
- bcrypt
- cryptography
- pyotp
- qrcode
- djangorestframework
- Pillow
- pyjwt
- gunicorn

### Frontend:

- React
- React Router DOM
- Axios
- Tailwind CSS
- shadcn/ui
- React Hot toast
