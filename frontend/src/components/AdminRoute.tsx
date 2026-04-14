import { Outlet, Navigate } from "react-router";
import { useSelector } from "react-redux";
import type { RootState } from "../store/store";
import { useLocalizedHref } from "../hooks/useLocalizedPath";

const AdminRoute = () => {
  const { userInfo } = useSelector((state: RootState) => state.auth);
  const loginHref = useLocalizedHref("/login");
  return userInfo?.isAdmin ? <Outlet /> : <Navigate to={loginHref} />;
};

export default AdminRoute;
