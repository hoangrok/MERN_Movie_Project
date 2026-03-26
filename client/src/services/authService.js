import axios from "axios";
import toast from "react-hot-toast";

const API_URL =
  import.meta.env.VITE_API_URL || "http://localhost:5000/api";

// ==============================
// LOGIN
// ==============================
export const login = async (email, password) => {
  try {
    const { data } = await axios.post(`${API_URL}/users/login`, {
      email,
      password,
    });

    if (data?.success) {
      toast.success(data.message || "Đăng nhập thành công");
      return data;
    }

    toast.error(data?.message || "Đăng nhập thất bại");
    return data;
  } catch (error) {
    const message =
      error?.response?.data?.message || "Đăng nhập thất bại";
    toast.error(message);
    console.log("login error:", error);
    return {
      success: false,
      message,
    };
  }
};

// ==============================
// REGISTER
// ==============================
export const register = async ({ name, email, password }) => {
  try {
    const { data } = await axios.post(`${API_URL}/users/register`, {
      name,
      email,
      password,
    });

    if (data?.success) {
      toast.success(data.message || "Đăng ký thành công");
      return data;
    }

    toast.error(data?.message || "Đăng ký thất bại");
    return data;
  } catch (error) {
    const message =
      error?.response?.data?.message || "Đăng ký thất bại";
    toast.error(message);
    console.log("register error:", error);
    return {
      success: false,
      message,
    };
  }
};

// ==============================
// LOGOUT
// ==============================
export const signOutFromBackend = async () => {
  try {
    sessionStorage.removeItem("user");
    localStorage.removeItem("user");
    return { success: true };
  } catch (error) {
    console.log("logout error:", error);
    return {
      success: false,
      message: "Đăng xuất thất bại",
    };
  }
};