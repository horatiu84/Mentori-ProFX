import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Mentori1La20 from "./Mentors1la20";
import ConfirmWebinar from "./pages/ConfirmWebinar";

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Mentori1La20 />} />
        <Route path="/confirm/:token" element={<ConfirmWebinar />} />
      </Routes>
    </Router>
  );
}
