import { createContext, useState, useContext, useEffect } from "react";
import axios from "axios";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const storedUser = localStorage.getItem("workflow_user");

      if (storedUser) {
        setUser(JSON.parse(storedUser));
      }
    } catch (error) {
      console.error("Corrupted user data");
      localStorage.removeItem("workflow_user");
    }

    setLoading(false);
  }, []);

  const login = async (id, email, password) => {
    try {
      const res = await axios.post(
        "http://localhost:5000/auth/login",
        { id, email, password }
      );

      setUser(res.data);
      localStorage.setItem("workflow_user", JSON.stringify(res.data));

      return { success: true };

    } catch (err) {
      return {
        success: false,
        message: err.response?.data?.error || "Login failed",
      };
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem("workflow_user");
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);