import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { APITester } from "./APITester";
import "./index.css";

import logo from "./logo.svg";
import reactLogo from "./react.svg";
import { BrowserRouter, Route, Routes } from "react-router";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import SharedConversation from "./pages/SharedConversation";

export function App() {
  return <BrowserRouter>
    <Routes>
      <Route path="/auth" element={<Auth />} />
      <Route path="/" element={<Dashboard />} />
      <Route path="/chat/:slug" element={<Dashboard />} />
      <Route path="/project/:projectId" element={<Dashboard />} />
      <Route path="/share/:slug" element={<SharedConversation />} />
    </Routes>
  </BrowserRouter>;

}

export default App;
