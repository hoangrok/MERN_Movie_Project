import React from "react";
import { Navigate } from "react-router-dom";
import { useSelector } from "react-redux";

const GuardedRoute = ({ children }) => {
  const { user } = useSelector((state) => state.auth);

  if (!user?.token) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

export default GuardedRoute;