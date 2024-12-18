export const generateKey = async () => {
  try {
    const key = await window.crypto.subtle.generateKey(
      {
        name: "AES-GCM",
        length: 256,
      },
      true,
      ["encrypt", "decrypt"]
    );
    return key;
  } catch (error) {
    console.error("Key generation error:", error);
    throw error;
  }
};

export const encryptFile = async (file, key) => {
  try {
    const fileBuffer = await file.arrayBuffer();
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    const encryptedContent = await window.crypto.subtle.encrypt(
      {
        name: "AES-GCM",
        iv: iv,
      },
      key,
      fileBuffer
    );
    const encryptedBuffer = new Uint8Array(encryptedContent);
    const authTag = encryptedBuffer.slice(encryptedBuffer.length - 16);
    const ciphertext = encryptedBuffer.slice(0, encryptedBuffer.length - 16);
    return {
      encryptedBuffer: ciphertext,
      authTag: authTag,
      iv: iv,
    };
  } catch (error) {
    console.error("Encryption error:", error);
    throw error;
  }
};

export const decryptFile = async (encryptedBuffer, iv, key, authTag) => {
  try {
    const combinedBuffer = new Uint8Array([...encryptedBuffer, ...authTag]);
    const decryptedContent = await window.crypto.subtle.decrypt(
      {
        name: "AES-GCM",
        iv: iv,
        tagLength: 128,
      },
      key,
      combinedBuffer
    );
    return decryptedContent;
  } catch (error) {
    console.error("Decryption error:", error);
    throw error;
  }
};

export const exportKey = async (key) => {
  try {
    // Export the key in a format that can be sent to the server
    const exportedKey = await window.crypto.subtle.exportKey("raw", key);
    return Array.from(new Uint8Array(exportedKey));
  } catch (error) {
    console.error("Key export error:", error);
    throw error;
  }
};

export const importKey = async (exportedKey) => {
  try {
    const keyBuffer = new Uint8Array(exportedKey);
    const importedKey = await window.crypto.subtle.importKey(
      "raw",
      keyBuffer,
      {
        name: "AES-GCM",
        length: 256,
      },
      false,
      ["encrypt", "decrypt"]
    );
    return importedKey;
  } catch (error) {
    console.error("Key import error:", error);
    throw error;
  }
};

export const formatBytes = (bytes) => {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
};
