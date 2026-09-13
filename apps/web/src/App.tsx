import { ConfigProvider } from "antd";
import { BrowserRouter, Route, Routes } from "react-router";
import { ListPage } from "./pages/ListPage.js";
import { DetailsPage } from "./pages/DetailsPage.js";

export function App() {
  return (
    <ConfigProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<ListPage />} />
          <Route path="/details/:id" element={<DetailsPage />} />
        </Routes>
      </BrowserRouter>
    </ConfigProvider>
  );
}
