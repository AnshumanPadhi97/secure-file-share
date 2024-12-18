import React, { useState, useEffect } from "react";
import {
  FileText,
  Download,
  Trash2,
  Share2,
  Eye,
  Search,
  X,
  Copy,
} from "lucide-react";
import { formatBytes } from "../Utils/Util";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Label } from "@/components/ui/label";
import FilePreview from "./FilePreview";
import axios from "axios";
import { toast } from "react-hot-toast";
import axiosApi from "@/Utils/AxiosClient";

const FileList = ({
  files,
  onDownload,
  onDelete,
  onUpdatePermissions,
  userRole,
  userId,
}) => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState(null);
  const [shareLink, setShareLink] = useState(null);
  const [expirationTime, setExpirationTime] = useState(60);
  const [searchQuery, setSearchQuery] = useState("");
  const [permissions, setPermissions] = useState([]);
  const [users, setUsers] = useState([]);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await axiosApi.get(`users/`);
      let u = response.data.users;
      let d = u.filter((x) => x.id !== userId);
      setUsers(d);
    } catch (error) {
      toast.error("Failed to fetch users");
    }
  };

  const fetchPermissions = async (fileid) => {
    try {
      const response = await axiosApi.get(`permissions/${fileid}/`);
      let data = response.data.permissions || [];
      setPermissions(data);
    } catch (error) {
      toast.error("Failed to fetch permissions");
    }
  };

  const openDialog = (file, mode) => {
    setSelectedFile(file);
    setDialogMode(mode);
    setIsDialogOpen(true);
    if (mode === "permissions") {
      fetchPermissions(file.id);
      setSearchQuery("");
    }
  };

  const generateShareLink = async () => {
    try {
      const response = await axiosApi.post("generate/", {
        file_id: selectedFile.id,
        expiration: expirationTime,
      });
      const data = response.data;
      if (data.success) {
        setShareLink(data);
        toast.success("Share Link Generated");
      } else {
        toast.error("Failed to generate share link");
      }
    } catch (error) {
      toast.error("Could not generate share link");
    }
  };

  const copyShareLink = () => {
    if (shareLink) {
      navigator.clipboard.writeText(shareLink.share_link);
      toast.success("Link Copied");
    }
  };

  const shareViaSystem = () => {
    if (shareLink && navigator.share) {
      navigator.share({
        title: `Shared File: ${selectedFile.filename}`,
        text: "Check out this shared file",
        url: shareLink.share_link,
      });
    }
  };

  const handleAccessLevelChange = (userId, accessType) => {
    setPermissions((prev) => {
      const newPermissions = [...prev];
      const index = newPermissions.findIndex((p) => p.userId === userId);
      if (index >= 0) {
        newPermissions[index] = { ...newPermissions[index], accessType };
      } else {
        newPermissions.push({ userId, accessType });
      }
      return newPermissions;
    });
  };

  const handleRemoveAccess = (userId) => {
    setPermissions((prev) => prev.filter((p) => p.userId !== userId));
  };

  const filteredUsers = users.filter(
    (user) =>
      user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="px-6 py-4 border-b border-gray-200">
        <h2 className="text-lg font-medium text-gray-800">My Files</h2>
      </div>
      {files.length === 0 ? (
        <div className="px-6 py-4 text-center text-gray-500">
          <p>No Files uploaded.</p>
        </div>
      ) : (
        <ul className="divide-y divide-gray-200">
          {files.map((file) => (
            <li
              key={file.id}
              className="px-6 py-4 hover:bg-gray-50 transition duration-150 ease-in-out"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <FileText size={20} className="text-blue-600" />
                  <div>
                    <p className="text-sm font-medium text-gray-800">
                      {file.filename}
                    </p>
                    <p className="text-xs text-gray-500">
                      {formatBytes(file.size)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  {userId == file.user_id || userRole == "admin" ? (
                    <>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openDialog(file, "permissions")}
                        aria-label={`Manage permissions for ${file.filename}`}
                      >
                        <Search size={18} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onDelete(file)}
                        aria-label={`Delete ${file.filename}`}
                      >
                        <Trash2 size={18} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openDialog(file, "share")}
                        aria-label={`Share ${file.filename}`}
                      >
                        <Share2 size={18} />
                      </Button>
                    </>
                  ) : (
                    ""
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onDownload(file)}
                    aria-label={`Download ${file.filename}`}
                  >
                    <Download size={18} />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => openDialog(file, "preview")}
                    aria-label={`Preview ${file.filename}`}
                  >
                    <Eye size={18} />
                  </Button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>
              {dialogMode === "share" && "Generate Shareable Link"}
              {dialogMode === "permissions" && "Manage Permissions"}
              {dialogMode === "preview" && "File Preview"}
            </DialogTitle>
            <DialogDescription>
              {dialogMode === "share" &&
                `Create a shareable link for "${selectedFile?.filename}"`}
              {dialogMode === "permissions" &&
                `Manage permissions for "${selectedFile?.filename}"`}
              {dialogMode === "preview" &&
                `Preview of "${selectedFile?.filename}"`}
            </DialogDescription>
          </DialogHeader>
          {dialogMode === "share" && selectedFile && (
            <div className="space-y-4">
              <div>
                <Label>File: {selectedFile.filename}</Label>
              </div>
              <div>
                <Label>Expiration Time</Label>
                <Select
                  value={expirationTime.toString()}
                  onValueChange={(value) => setExpirationTime(parseInt(value))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select expiration time" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="30">30 Seconds</SelectItem>
                    <SelectItem value="60">1 Minute</SelectItem>
                    <SelectItem value="120">2 Minutes</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex space-x-2">
                <Button onClick={generateShareLink}>
                  <Share2 className="mr-2" /> Generate Share Link
                </Button>
              </div>
              {shareLink && (
                <div className="mt-4 space-y-2">
                  <div className="flex items-center space-x-2">
                    <Input
                      value={shareLink.share_link}
                      readOnly
                      className="flex-grow"
                    />
                    <Button variant="outline" onClick={copyShareLink}>
                      <Copy className="mr-2" /> Copy
                    </Button>
                    {navigator.share && (
                      <Button variant="outline" onClick={shareViaSystem}>
                        <Share2 className="mr-2" /> Share
                      </Button>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Link expires on:{" "}
                    {new Date(shareLink.expires_at).toLocaleString()}
                  </p>
                </div>
              )}
            </div>
          )}
          {dialogMode === "permissions" && selectedFile && (
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Search className="w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Add people"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="flex-1"
                />
              </div>
              <div className="space-y-4">
                <h4 className="text-sm font-medium">People with access</h4>
                {permissions.map((permission) => {
                  const user = users.find((u) => u.id === permission.userId);
                  if (!user) return null;
                  return (
                    <div
                      key={user.id}
                      className="flex items-center justify-between gap-4"
                    >
                      <div className="flex items-center gap-4">
                        <Avatar>
                          <AvatarImage src={user.avatarUrl} />
                          <AvatarFallback>
                            {user.name.slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-sm font-medium">{user.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {user.email}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Select
                          value={permission.accessType || "view"}
                          onValueChange={(value) =>
                            handleAccessLevelChange(user.id, value)
                          }
                        >
                          <SelectTrigger className="w-[110px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="view">View Only</SelectItem>
                            <SelectItem value="downloadview">
                              Download and View
                            </SelectItem>
                          </SelectContent>
                        </Select>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveAccess(user.id)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
                {searchQuery && (
                  <div className="border rounded-lg">
                    {filteredUsers
                      .filter(
                        (user) => !permissions.some((p) => p.userId === user.id)
                      )
                      .map((user) => (
                        <div
                          key={user.id}
                          className="flex items-center justify-between p-2 hover:bg-accent cursor-pointer"
                          onClick={() =>
                            handleAccessLevelChange(user.id, "viewer")
                          }
                        >
                          <div className="flex items-center gap-4">
                            <Avatar>
                              <AvatarImage src={user.avatarUrl} />
                              <AvatarFallback>
                                {user.name.slice(0, 2).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="text-sm font-medium">{user.name}</p>
                              <p className="text-sm text-muted-foreground">
                                {user.email}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            </div>
          )}
          {dialogMode === "preview" && selectedFile && (
            <FilePreview file={selectedFile} />
          )}
          <DialogFooter>
            <Button
              type="submit"
              onClick={() => {
                if (dialogMode === "permissions") {
                  onUpdatePermissions(selectedFile.id, permissions);
                }
                setIsDialogOpen(false);
              }}
            >
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default FileList;
