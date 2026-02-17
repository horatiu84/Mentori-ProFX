import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Mentori1La20 from "./Mentors1la20";
import ConfirmWebinar from "./pages/ConfirmWebinar";
import RegisterForm from "./pages/RegisterForm";
import Login from "./pages/Login";
import ProtectedRoute from "./components/ProtectedRoute";

export default function App() {
  return (
    <Router>
      <Routes>
        {/* Pagina publică de înscriere - ruta principală */}
        <Route path="/" element={<RegisterForm />} />
        
        {/* Pagina de login pentru mentorii și admin */}
        <Route path="/login" element={<Login />} />
        
        {/* Pagina publică de confirmare */}
        <Route path="/confirm/:token" element={<ConfirmWebinar />} />
        
        {/* Dashboard admin/mentor - rută protejată */}
        <Route 
          path="/admin" 
          element={
            <ProtectedRoute>
              <Mentori1La20 />
            </ProtectedRoute>
          } 
        />
      </Routes>
    </Router>
  );
}
