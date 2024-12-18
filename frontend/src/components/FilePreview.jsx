import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Eye } from "lucide-react";
import { toast } from "react-hot-toast";
import { decryptFile, formatBytes, importKey } from "../Utils/Util";
import axiosApi from "@/Utils/AxiosClient";

const FilePreview = ({ file }) => {
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [fileContent, setFileContent] = useState(null);
  const [downloadProgress, setDownloadProgress] = useState(0);

  const handlePreview = async () => {
    try {
      setDownloadProgress(0);
      const response = await axiosApi({
        url: `download/${file.id}/`,
        method: "GET",
        responseType: "arraybuffer",
        onDownloadProgress: (progressEvent) => {
          const percentCompleted = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total
          );
          setDownloadProgress(percentCompleted);
        },
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

      if (file.file_type.startsWith("image/")) {
        const imageUrl = URL.createObjectURL(blob);
        setFileContent({ type: "image", url: imageUrl });
      } else if (
        file.file_type.startsWith("text/") ||
        file.file_type === "application/json"
      ) {
        const text = await blob.text();
        setFileContent({ type: "text", content: text });
      } else if (file.file_type === "application/pdf") {
        const blob2 = new Blob([decryptedBuffer], { type: "application/pdf" });
        const pdfUrl = URL.createObjectURL(blob2);
        setFileContent({ type: "pdf", url: pdfUrl });
      } else {
        setFileContent({ type: "other" });
      }

      setPreviewModalOpen(true);
    } catch (error) {
      toast.error("Failed to preview");
    }
  };

  const renderPreviewContent = () => {
    if (!fileContent) return null;

    switch (fileContent.type) {
      case "image":
        return (
          <img
            src={fileContent.url}
            alt="File Preview"
            className="max-w-full h-auto mt-2"
          />
        );
      case "text":
        return (
          <pre className="bg-gray-100 p-4 rounded-md overflow-x-auto max-h-[500px] overflow-y-auto">
            {fileContent.content}
          </pre>
        );
      case "pdf":
        return (
          <iframe
            src={fileContent.url}
            width="100%"
            height="500px"
            title="PDF Preview"
          />
        );
      case "other":
        return (
          <div className="text-center text-muted-foreground">
            Preview not available for this file type
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col space-y-4">
      <Button
        variant="outline"
        onClick={handlePreview}
        className="flex items-center gap-2"
      >
        <Eye size={16} /> Preview
      </Button>

      {downloadProgress > 0 && downloadProgress < 100 && (
        <div className="w-full bg-gray-200 rounded-full h-2.5">
          <div
            className="bg-blue-600 h-2.5 rounded-full"
            style={{ width: `${downloadProgress}%` }}
          ></div>
        </div>
      )}

      <Dialog open={previewModalOpen} onOpenChange={setPreviewModalOpen}>
        <DialogContent className="sm:max-w-[625px]">
          <DialogHeader>
            <DialogTitle>File Preview: {file.filename}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <strong>File Type:</strong> {file.file_type}
              <br />
              <strong>File Size:</strong> {formatBytes(file.size)} bytes
            </div>
            {renderPreviewContent()}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default FilePreview;
