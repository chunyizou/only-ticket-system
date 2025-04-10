// AppWithRouter.jsx
import React from "react";
import { BrowserRouter, Routes, Route, Link } from "react-router-dom";
import "./styles.css";
import TicketSystem from "./components/TicketSystem";
import TicketVerification from "./components/TicketVerification";

export default function App() {
  return (
    <BrowserRouter>
      <div className="App">
        <nav className="bg-gray-800 text-white p-4">
          <div className="max-w-4xl mx-auto flex justify-between items-center">
            <div className="font-bold text-xl">ONLY1.0票务系统</div>
            <div className="flex space-x-4">
              <Link 
                to="/" 
                className="px-3 py-2 rounded hover:bg-gray-700 transition-colors"
              >
                售票系统
              </Link>
              <Link 
                to="/verify" 
                className="px-3 py-2 rounded hover:bg-gray-700 transition-colors"
              >
                入场验票
              </Link>
            </div>
          </div>
        </nav>
        
        <Routes>
          <Route path="/" element={<TicketSystem />} />
          <Route path="/verify" element={<TicketVerification />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}