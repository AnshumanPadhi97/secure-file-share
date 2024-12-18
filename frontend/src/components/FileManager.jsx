import React, { useState, useEffect } from "react";
import axios from "axios";
import {
  Upload,
  X,
  CheckCircle,
  Download,
  FileText,
  LogOut,
} from "lucide-react";
import {
  decryptFile,
  encryptFile,
  exportKey,
  generateKey,
  importKey,
} from "../Utils/Util";
import FileList from "./FileList";
import { toast } from "react-hot-toast";
import { UserList } from "./UserList";
import { useNavigate } from "react-router-dom";
import axiosApi from "@/Utils/AxiosClient";

export function FileManager() {
  const userInfo = JSON.parse(localStorage.getItem("user") || "{}");
  let userId = userInfo.user_id;
  let userRole = userInfo.role;
  const [file, setFile] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState("idle");
  const [files, setFiles] = useState([]);

  useEffect(() => {
    fetchFiles();
  }, []);

  const fetchFiles = async () => {
    try {
      const response = await axiosApi.get(`files/${userId}/`);
      setFiles(response.data.files);
    } catch (error) {
      toast.error("Failed to fetch files");
    }
  };

  const handleFileChange = (event) => {
    const selectedFile = event.target.files[0];
    setFile(selectedFile);
    setUploadStatus("idle");
  };

  const clearFile = () => {
    setFile(null);
    setUploadProgress(0);
    setUploadStatus("idle");
  };

  const handleUpload = async () => {
    if (!file) return;

    try {
      setUploadStatus("uploading");
      setUploadProgress(0);

      const encryptionKey = await generateKey();
      const { encryptedBuffer, iv, authTag } = await encryptFile(
        file,
        encryptionKey
      );
      const exportedKey = await exportKey(encryptionKey);

      const formData = new FormData();
      formData.append("file", new Blob([encryptedBuffer]), file.name);
      formData.append("iv", JSON.stringify(Array.from(iv)));
      formData.append("key", JSON.stringify(exportedKey));
      formData.append("user_id", userId);
      formData.append("authTag", JSON.stringify(Array.from(authTag)));

      const response = await axiosApi.post("upload/", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total
          );
          setUploadProgress(percentCompleted);
        },
      });

      setUploadStatus("success");
      fetchFiles();
      setFile(null);
      toast.success("File Uploaded Successfully");
    } catch (error) {
      toast.error("Upload failed");
      setUploadStatus("error");
    }
  };

  const handleDownload = async (file) => {
    try {
      const response = await axiosApi({
        url: `download/${file.id}/`,
        method: "GET",
        responseType: "arraybuffer",
      });

      const encryptedContent = new Uint8Array(response.data);
      const ivArray = JSON.parse(response.headers.get("X-Encryption-IV"));
      const encKey = JSON.parse(response.headers.get("X-Encryption-key"));
      const authTag = JSON.parse(response.headers.get("X-authTag"));
      const iv = new Uint8Array(ivArray);
      const key = await importKey(encKey);

      const decryptedBuffer = await decryptFile(
        encryptedContent,
        iv,
        key,
        authTag
      );

      const blob = new Blob([decryptedBuffer]);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", file.filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success("File Downloaded");
    } catch (error) {
      toast.error("Download failed");
    }
  };

  const handleDelete = async (file) => {
    let fileId = file.id;
    try {
      await axiosApi.delete(`delete/${fileId}/`);
      fetchFiles();
      toast.success("File deleted successfully");
    } catch (error) {
      if (error.response) {
        toast.error("Error deleting file:", error.response.data);
      } else {
        toast.error("Error:", error.message);
      }
    }
  };

  const handlePermission = async (fileId, permissions) => {
    const data = {
      fileId: fileId,
      permissions: permissions,
    };

    try {
      await axiosApi.post("uploadpermissions/", data, {
        headers: {
          "Content-Type": "application/json",
        },
      });
      toast.success("Permissions updated succesfully");
    } catch (error) {
      toast.error(
        "Error uploading data:",
        error.response ? error.response.data : error.message
      );
    }
  };

  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem("user");
    localStorage.removeItem("token");
    delete axiosApi.defaults.headers.common["Authorization"];
    navigate("/auth");
  };

  return (
    <div className="container mx-auto p-6">
      <div className="absolute top-4 right-4">
        <button
          onClick={handleLogout}
          className="flex items-center px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
        >
          <LogOut className="mr-2" size={20} />
          Logout
        </button>
      </div>
      {/* File Upload Section */}
      {userRole != "guest" && (
        <div className="max-w-md mx-auto bg-white shadow-md rounded-lg p-6 mb-6">
          <input
            type="file"
            onChange={handleFileChange}
            className="hidden"
            id="fileInput"
          />
          <div className="flex items-center space-x-4">
            <label
              htmlFor="fileInput"
              className="cursor-pointer flex items-center px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              <Upload className="mr-2" size={20} />
              Choose File
            </label>
            {file && (
              <div className="flex items-center space-x-2">
                <span className="truncate max-w-[150px]">{file.name}</span>
                <button onClick={clearFile} className="text-red-500">
                  <X size={20} />
                </button>
              </div>
            )}
          </div>
          {file && uploadStatus !== "success" && (
            <div className="mt-4">
              <div className="w-full bg-gray-200 rounded-full h-2.5">
                <div
                  className="bg-blue-600 h-2.5 rounded-full"
                  style={{ width: `${uploadProgress}%` }}
                ></div>
              </div>
              <div className="flex justify-between items-center mt-2">
                <span>{uploadProgress}%</span>
                <button
                  onClick={handleUpload}
                  disabled={uploadStatus === "uploading"}
                  className={`
                  flex items-center px-4 py-2 rounded 
                  ${
                    uploadStatus === "uploading"
                      ? "bg-gray-300 text-gray-500"
                      : "bg-green-500 text-white hover:bg-green-600"
                  }
                `}
                >
                  {uploadStatus === "success" ? (
                    <>
                      <CheckCircle className="mr-2" size={20} />
                      Uploaded
                    </>
                  ) : (
                    "Upload"
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
      {/* File List Section */}
      <div className="min-h-screen bg-gray-100 py-12 px-4 sm:px-6 lg:px-8">
        <FileList
          files={files}
          onDownload={handleDownload}
          onDelete={handleDelete}
          onUpdatePermissions={handlePermission}
          userId={userId}
          userRole={userRole}
        />
        {/* Add UserList Component for Admin */}
        {userRole == "admin" && (
          <UserList userId={userId} userRole={userRole} />
        )}
      </div>
    </div>
  );
}
