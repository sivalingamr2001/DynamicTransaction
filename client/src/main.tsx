import { StrictMode } from "react"
import { createRoot } from "react-dom/client"

import { AuthProvider } from "@/context/AuthContext"
import { BrowserRouter } from "react-router-dom"
import { Toaster } from "sonner"
import App from "./App.tsx"
import { TooltipProvider } from "./components/ui/tooltip.tsx"
import "./index.css"

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <TooltipProvider>
        <BrowserRouter basename="/jsp_portal/">
          <AuthProvider>
            <Toaster position="top-right" richColors />
            <App />
          </AuthProvider>
        </BrowserRouter>
    </TooltipProvider>
  </StrictMode>
)
