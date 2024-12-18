import React, { useState, useEffect } from "react";
import axios from "axios";
import { toast } from "react-hot-toast";
import { Trash2, Edit } from "lucide-react";
import axiosApi from "@/Utils/AxiosClient";

export function UserList({ userId, userRole }) {
  const [users, setUsers] = useState([]);
  const [editingUser, setEditingUser] = useState(null);

  useEffect(() => {
    if (userRole == "admin") {
      fetchUsers();
    }
  }, [userRole]);

  const fetchUsers = async () => {
    try {
      const response = await axiosApi.get("users/");
      setUsers(response.data.users);
    } catch (error) {
      toast.error("Failed to fetch users");
    }
  };

  const handleRoleChange = async (user) => {
    const data = {
      userid: user.id,
      role: editingUser.role,
    };
    try {
      await axiosApi.post("updateUser/", data);
      setEditingUser(null);
      toast.success("User role updated successfully");
      fetchUsers();
    } catch (error) {
      toast.error("Failed to update user role");
    }
  };

  const handleDeleteUser = async (userId) => {
    try {
      await axiosApi.delete(`/deleteUser/${userId}/`);
      fetchUsers();
      toast.success("User deleted successfully");
    } catch (error) {
      toast.error("Failed to delete user");
    }
  };

  if (userRole !== "admin") {
    return null;
  }

  return (
    <div className="bg-white shadow-md rounded-lg p-6 mt-6">
      <h2 className="text-2xl font-bold mb-4">User Management</h2>
      <table className="w-full border-collapse">
        <thead>
          <tr className="bg-gray-100">
            <th className="border p-2 text-left">User ID</th>
            <th className="border p-2 text-left">Username</th>
            <th className="border p-2 text-left">Email</th>
            <th className="border p-2 text-left">Role</th>
            <th className="border p-2 text-center">Actions</th>
          </tr>
        </thead>
        <tbody>
          {users.map((user) => (
            <tr key={user.id} className="hover:bg-gray-50">
              <td className="border p-2">{user.id}</td>
              <td className="border p-2">{user.name}</td>
              <td className="border p-2">{user.email}</td>
              <td className="border p-2">
                {editingUser?.id === user.id ? (
                  <select
                    value={editingUser.role}
                    onChange={(e) =>
                      setEditingUser({
                        ...editingUser,
                        role: e.target.value,
                      })
                    }
                    className="w-full p-1 border rounded"
                  >
                    <option value="admin">Admin</option>
                    <option value="user">User</option>
                    <option value="guest">Guest</option>
                  </select>
                ) : (
                  user.role
                )}
              </td>
              <td className="border p-2 text-center">
                <div className="flex justify-center space-x-2">
                  {editingUser?.id === user.id ? (
                    <>
                      <button
                        onClick={() => handleRoleChange(user)}
                        className="bg-green-500 text-white px-2 py-1 rounded hover:bg-green-600"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => setEditingUser(null)}
                        className="bg-gray-300 text-gray-700 px-2 py-1 rounded hover:bg-gray-400"
                      >
                        Cancel
                      </button>
                    </>
                  ) : (
                    <>
                      {user.id != userId && (
                        <>
                          <button
                            onClick={() => setEditingUser(user)}
                            className="text-blue-500 hover:text-blue-700"
                          >
                            <Edit size={20} />
                          </button>
                          <button
                            onClick={() => handleDeleteUser(user.id)}
                            className="text-red-500 hover:text-red-700"
                          >
                            <Trash2 size={20} />
                          </button>
                        </>
                      )}
                    </>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
