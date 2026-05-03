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
// FORGOT PASSWORD
// ==============================
export const forgotPassword = async (email) => {
  try {
    const { data } = await axios.post(`${API_URL}/users/forgot-password`, { email });
    if (data?.success) toast.success(data.message);
    else toast.error(data?.message || "Có lỗi xảy ra");
    return data;
  } catch (error) {
    const message = error?.response?.data?.message || "Có lỗi xảy ra";
    toast.error(message);
    return { success: false, message };
  }
};

// ==============================
// RESET PASSWORD
// ==============================
export const resetPassword = async ({ token, newPassword }) => {
  try {
    const { data } = await axios.post(`${API_URL}/users/reset-password/${token}`, { newPassword });
    if (data?.success) toast.success(data.message);
    else toast.error(data?.message || "Có lỗi xảy ra");
    return data;
  } catch (error) {
    const message = error?.response?.data?.message || "Có lỗi xảy ra";
    toast.error(message);
    return { success: false, message };
  }
};

// ==============================
// UPDATE PROFILE (name)
// ==============================
export const updateProfile = async ({ name, token }) => {
  try {
    const { data } = await axios.put(
      `${API_URL}/users/profile`,
      { name },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    if (data?.success) toast.success(data.message || "Đã cập nhật tên");
    else toast.error(data?.message || "Cập nhật thất bại");
    return data;
  } catch (error) {
    const message = error?.response?.data?.message || "Cập nhật thất bại";
    toast.error(message);
    return { success: false, message };
  }
};

// ==============================
// CHANGE PASSWORD
// ==============================
export const changePassword = async ({ currentPassword, newPassword, token }) => {
  try {
    const { data } = await axios.put(
      `${API_URL}/users/change-password`,
      { currentPassword, newPassword },
      { headers: { Authorization: `Bearer ${token}` } }
    );

    if (data?.success) {
      toast.success(data.message || "Đổi mật khẩu thành công");
      return data;
    }

    toast.error(data?.message || "Đổi mật khẩu thất bại");
    return data;
  } catch (error) {
    const message = error?.response?.data?.message || "Đổi mật khẩu thất bại";
    toast.error(message);
    return { success: false, message };
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