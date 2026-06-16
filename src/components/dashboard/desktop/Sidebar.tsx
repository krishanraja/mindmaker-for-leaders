import * as React from "react"
import { useNavigate, useLocation } from "react-router-dom"
import { Home, BarChart3, Calendar, Mic, Target, ClipboardList, Settings, LogOut } from "lucide-react"
import { cn } from "@/lib/utils"
import { useAuth } from "@/components/auth/AuthProvider"
import { Button } from "@/components/ui/button"
import { CtrlLogo } from "@/components/landing/CtrlLogo"

const navItems = [
  { path: '/dashboard', icon: Home, label: 'Dashboard' },
  { path: '/pulse', icon: BarChart3, label: 'Strategic Pulse' },
  { path: '/today', icon: Calendar, label: 'Today' },
  { path: '/voice', icon: Mic, label: 'Voice Entry' },
  { path: '/progress', icon: Target, label: 'Progress' },
  { path: '/missions/history', icon: ClipboardList, label: 'Missions' },
]

export function Sidebar() {
  const navigate = useNavigate()
  const location = useLocation()
  const { signOut } = useAuth()

  return (
    <aside className="fixed left-0 top-0 bottom-0 w-64 bg-card border-r border-border flex flex-col">
      {/* Logo */}
      <div className="p-6 border-b border-border">
        <CtrlLogo className="h-5 w-auto" />
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = location.pathname === item.path
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium",
                "transition-colors duration-200",
                isActive
                  ? "bg-accent/10 text-accent"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary"
              )}
            >
              <Icon className="h-5 w-5" />
              {item.label}
            </button>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-border space-y-1">
        <button
          onClick={() => navigate('/settings')}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
        >
          <Settings className="h-5 w-5" />
          Settings
        </button>
        <button
          onClick={signOut}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
        >
          <LogOut className="h-5 w-5" />
          Sign Out
        </button>
      </div>
    </aside>
  )
}
