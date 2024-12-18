import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileManager } from "./FileManager";

const Dashboard = () => {
  const userInfo = JSON.parse(localStorage.getItem("user") || "{}");
  return (
    <div className="container mx-auto p-4">
      <Card>
        <CardHeader className="flex justify-between items-center">
          <CardTitle>File Sharing Manager</CardTitle>
          <div className="flex items-center space-x-4">
            <span>Welcome, {userInfo.name || "User"}</span>
          </div>
        </CardHeader>
        <CardContent>
          <FileManager />
        </CardContent>
      </Card>
    </div>
  );
};

export default Dashboard;
