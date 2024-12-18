import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "react-hot-toast";
import axiosApi from "@/Utils/AxiosClient";

const TOTPSetup = ({ userId, onSetupComplete }) => {
  const [qrCode, setQrCode] = useState(null);
  const [secret, setSecret] = useState(null);
  const [token, setToken] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const fetchTOTPSetup = async () => {
      setIsLoading(true);
      try {
        const response = await axiosApi.post(
          "/totp/setup/",
          JSON.stringify({ user_id: userId }),
          {
            headers: {
              "Content-Type": "application/json",
            },
          }
        );
        setQrCode(`data:image/png;base64,${response.data.qr_code}`);
        setSecret(response.data.secret);
      } catch (err) {
        console.error("TOTP Setup Error:", err.response || err);
        toast.error(
          err.response?.data?.error ||
            "Failed to generate TOTP setup. Please try again."
        );
      } finally {
        setIsLoading(false);
      }
    };
    if (userId) {
      fetchTOTPSetup();
    }
  }, [userId]);

  const handleVerifyToken = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await axiosApi.post(
        "/totp/verify/",
        JSON.stringify({
          user_id: userId,
          token,
        }),
        {
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
      toast.success("Two-factor authentication enabled");
      onSetupComplete();
    } catch (err) {
      console.error("TOTP Verify Error:", err.response || err);
      toast.error(
        err.response?.data?.error || "Verification failed. Please try again."
      );
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-full">
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {qrCode ? (
        <div className="text-center space-y-4">
          <p className="font-medium">Set Up Two-Factor Authentication</p>
          <p className="text-sm text-gray-600">
            Scan this QR code with your authenticator app
          </p>
          <div className="flex justify-center">
            <img
              src={qrCode}
              alt="TOTP QR Code"
              className="max-w-[200px] mx-auto"
            />
          </div>
          <p className="text-sm text-gray-600 break-words">
            Manual Entry Secret: <span className="font-bold">{secret}</span>
          </p>
        </div>
      ) : (
        <div className="text-center text-red-600">
          Failed to generate QR code. Please try again.
        </div>
      )}
      <form onSubmit={handleVerifyToken} className="space-y-4">
        <div>
          <Label htmlFor="totpToken">Verification Code</Label>
          <Input
            id="totpToken"
            type="text"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder="Enter 6-digit code"
            maxLength={6}
            pattern="\d{6}"
            required
          />
        </div>
        <Button type="submit" className="w-full" disabled={!qrCode}>
          Verify and Enable 2FA
        </Button>
      </form>
    </div>
  );
};

const AuthPage = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [totpToken, setTotpToken] = useState("");
  const [requiresTwoFactor, setRequiresTwoFactor] = useState(false);
  const [registrationSuccess, setRegistrationSuccess] = useState(false);
  const [registeredUserId, setRegisteredUserId] = useState(null);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      if (isLogin) {
        const payload = {
          email,
          password,
          ...(requiresTwoFactor ? { totp_token: totpToken } : {}),
        };

        const response = await axiosApi.post("login/", payload);

        if (response.data.requires_2fa) {
          setRequiresTwoFactor(true);
          return;
        }
        //cookie handles this --so not required to manually set
        // // Store the JWT token
        // localStorage.setItem("token", response.data.token);
        // // Update axios instance with the new token
        // axiosApi.defaults.headers.common[
        //   "Authorization"
        // ] = `Bearer ${response.data.token}`;
        localStorage.setItem("user", JSON.stringify(response.data));
        navigate("/file-manager");
        toast.success("Login Successful");
      } else {
        const payload = { name, email, password, role: "user" };
        const response = await axiosApi.post("register/", payload);
        setRegisteredUserId(response.data.user_id);
        toast.success("Registration Successfull");
        setRegistrationSuccess(true);
      }
    } catch (err) {
      if (err.response?.data) toast.error(err.response.data.error);
      else toast.error("Network error. Please try again.");
    }
  };

  const handleTOTPSetupComplete = () => {
    setRegistrationSuccess(false);
    setIsLogin(true);
    toast.success("Registration complete. Please login.");
  };

  const renderLoginForm = () => (
    <>
      {!requiresTwoFactor ? (
        <>
          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div>
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
        </>
      ) : (
        <div>
          <Label htmlFor="totpToken">Two-Factor Authentication Code</Label>
          <Input
            id="totpToken"
            type="text"
            value={totpToken}
            onChange={(e) => setTotpToken(e.target.value)}
            placeholder="Enter 6-digit code"
            required
          />
        </div>
      )}
    </>
  );

  const renderRegistrationForm = () => (
    <>
      <div>
        <Label htmlFor="name">Name</Label>
        <Input
          id="name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
      </div>
      <div>
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </div>
      <div>
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
      </div>
    </>
  );

  const resetForm = () => {
    setRequiresTwoFactor(false);
    setTotpToken("");
    setRegistrationSuccess(false);
    setRegisteredUserId(null);
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>
            {registrationSuccess
              ? "Two-Factor Authentication"
              : isLogin
              ? requiresTwoFactor
                ? "Two-Factor Authentication"
                : "Login"
              : "Register"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {registrationSuccess ? (
            <TOTPSetup
              userId={registeredUserId}
              onSetupComplete={handleTOTPSetupComplete}
            />
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {isLogin ? renderLoginForm() : renderRegistrationForm()}

              <Button type="submit" className="w-full">
                {isLogin
                  ? requiresTwoFactor
                    ? "Verify"
                    : "Login"
                  : "Register"}
              </Button>

              {!requiresTwoFactor && (
                <div className="text-center">
                  <Button
                    variant="link"
                    type="button"
                    onClick={() => {
                      resetForm();
                      setIsLogin(!isLogin);
                    }}
                  >
                    {isLogin
                      ? "Need an account? Register"
                      : "Already have an account? Login"}
                  </Button>
                </div>
              )}
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AuthPage;
