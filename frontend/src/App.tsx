import {
  createBrowserRouter,
  Navigate,
  RouterProvider,
} from "react-router-dom";
import Root, { loader as rootLoader } from "./pages/Root";
import HomePage, { loader as homeLoader } from "./pages/Home";
import ProductDetailPage, {
  loader as productDetailLoader,
} from "./pages/ProductDetail.tsx";
import CartPage from "./pages/Cart";
import ShippingPage from "./pages/Shipping";
import PaymentPage from "./pages/Payment";
import CheckoutPage from "./pages/Checkout";
import LoginPage, { action as loginAction } from "./pages/Login";
import RegisterPage, { action as registerAction } from "./pages/Register";
import ProfilePage, { action as profileAction } from "./pages/Profile.tsx";
import ErrorPage from "./pages/Error";
import Fallback from "./components/Fallback.tsx";
import PrivateRoute from "./components/PrivateRoute.tsx";
import AdminRoute from "./components/AdminRoute.tsx";
import ProductsListPage, {
  loader as productsListLoader,
  action as productsListAction,
} from "./pages/admin/ProductList.tsx";
import ProductEditPage, {
  loader as productEditLoader,
  action as productEditAction,
} from "./pages/admin/ProductEdit.tsx";
import OverviewPage, { loader as overviewLoader } from "./pages/admin/Overview";
import UsersListPage, {
  loader as usersListLoader,
  action as usersListAction,
} from "./pages/admin/UserList.tsx";
import UserEditPage, {
  loader as userEditLoader,
  action as userEditAction,
} from "./pages/admin/UserEdit.tsx";
import OrdersListPage, {
  loader as ordersLoader,
} from "./pages/admin/OrderList.tsx";
import ReviewsListPage, {
  loader as reviewsLoader,
} from "./pages/admin/ReviewList.tsx";

import OrderPage, {
  loader as orderLoader,
  action as orderAction,
} from "./pages/Order";
import MyOrdersPage, { loader as myOrdersLoader } from "./pages/MyOrders";
import MyReviewsPage, { loader as myReviewsLoader } from "./pages/MyReviews";
import { DEFAULT_LOCALE } from "./i18n/locales";
import { SearchProvider } from "./context/SearchContext";

function App() {
  const router = createBrowserRouter([
    {
      path: "/",
      element: <Navigate to={`/${DEFAULT_LOCALE}`} replace />,
    },
    {
      path: "/:lang",
      element: <Root />,
      loader: rootLoader,
      errorElement: (
        <SearchProvider>
          <ErrorPage />
        </SearchProvider>
      ),
      hydrateFallbackElement: <Fallback />,
      children: [
        {
          index: true,
          element: <HomePage />,
          loader: homeLoader,
        },
        {
          path: "product/:productId",
          element: <ProductDetailPage />,
          loader: productDetailLoader,
        },
        {
          path: "cart",
          element: <CartPage />,
        },
        {
          path: "login",
          element: <LoginPage />,
          action: loginAction,
        },
        {
          path: "register",
          element: <RegisterPage />,
          action: registerAction,
        },
        {
          element: <PrivateRoute />,
          children: [
            {
              path: "profile",
              element: <ProfilePage />,
              action: profileAction,
            },
            {
              path: "shipping",
              element: <ShippingPage />,
            },
            {
              path: "payment",
              element: <PaymentPage />,
            },
            {
              path: "checkout",
              element: <CheckoutPage />,
            },
            {
              path: "order/:orderId",
              element: <OrderPage />,
              loader: orderLoader,
              action: orderAction,
            },
            {
              path: "my-orders",
              element: <MyOrdersPage />,
              loader: myOrdersLoader,
            },
            {
              path: "my-reviews",
              element: <MyReviewsPage />,
              loader: myReviewsLoader,
            },
          ],
        },
        {
          element: <AdminRoute />,
          children: [
            {
              path: "admin/users",
              element: <UsersListPage />,
              loader: usersListLoader,
              action: usersListAction,
            },
            {
              path: "admin/users/:userId/edit",
              element: <UserEditPage />,
              loader: userEditLoader,
              action: userEditAction,
            },
            {
              path: "admin/products",
              element: <ProductsListPage />,
              loader: productsListLoader,
              action: productsListAction,
            },
            {
              path: "admin/products/:productId/edit",
              element: <ProductEditPage />,
              loader: productEditLoader,
              action: productEditAction,
            },
            {
              path: "admin/overview",
              element: <OverviewPage />,
              loader: overviewLoader,
            },
            {
              path: "admin/orders",
              element: <OrdersListPage />,
              loader: ordersLoader,
            },
            {
              path: "admin/reviews",
              element: <ReviewsListPage />,
              loader: reviewsLoader,
            },
          ],
        },
      ],
    },
    { path: "*", element: <Navigate to={`/${DEFAULT_LOCALE}`} replace /> },
  ]);

  return <RouterProvider router={router} />;
}

export default App;
