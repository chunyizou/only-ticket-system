// index.js
import React from "react";
import { createRoot } from "react-dom/client";
import AppWithRouter from "./AppWithRouter";

const rootElement = document.getElementById("root");
const root = createRoot(rootElement);

root.render(
  <React.StrictMode>
    <AppWithRouter />
  </React.StrictMode>
);
// 导入Service Worker注册函数
import { register } from './serviceWorkerRegistration';

// 注册Service Worker
register();