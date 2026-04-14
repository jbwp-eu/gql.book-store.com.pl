import { useSelector } from "react-redux";
import type { RootState } from "../store/store";
import { Outlet, Navigate, useLocation } from "react-router";
import { useLocalizedHref } from "../hooks/useLocalizedPath";

const PrivateRoute = () => {
  const { userInfo } = useSelector((state: RootState) => state.auth);
  const location = useLocation();
  const loginHref = useLocalizedHref("/login");
  if (userInfo?.email) return <Outlet />;
  const redirectPath = location.pathname + location.search + location.hash;

  return (
    <Navigate
      to={`${loginHref}?redirect=${encodeURIComponent(redirectPath)}`}
      replace
    />
  );
};

export default PrivateRoute;
