import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Brain,
  Eye,
  History,
  Home,
  LogOut,
  Mic,
  Radio,
  Scale,
  Settings,
  Shield,
  Target,
  User,
  Zap,
} from 'lucide-react'
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from '@/components/ui/command'
import { useAuth } from '@/components/auth/AuthProvider'

interface CommandPaletteDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CommandPaletteDialog({ open, onOpenChange }: CommandPaletteDialogProps) {
  const navigate = useNavigate()
  const { signOut } = useAuth()
  const [query, setQuery] = useState('')
  const searching = query.trim().length > 0

  const go = (path: string) => () => {
    onOpenChange(false)
    navigate(path)
  }

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput value={query} onValueChange={setQuery} placeholder="Search or jump anywhere..." />
      <CommandList className="max-h-[420px]">
        <CommandEmpty>No matches.</CommandEmpty>
        <CommandGroup heading="Go to">
          <CommandItem onSelect={go('/dashboard')}><Home className="mr-2 h-4 w-4" />Today<CommandShortcut>G H</CommandShortcut></CommandItem>
          <CommandItem onSelect={go('/decision')}><Scale className="mr-2 h-4 w-4" />Decide<CommandShortcut>G D</CommandShortcut></CommandItem>
          <CommandItem onSelect={go('/blind-spot')}><Eye className="mr-2 h-4 w-4" />Find a blind spot<CommandShortcut>G S</CommandShortcut></CommandItem>
          <CommandItem onSelect={go('/memory')}><Brain className="mr-2 h-4 w-4" />Brain<CommandShortcut>G B</CommandShortcut></CommandItem>
          <CommandItem onSelect={go('/track-record')}><History className="mr-2 h-4 w-4" />History<CommandShortcut>G Y</CommandShortcut></CommandItem>
        </CommandGroup>

        <CommandSeparator />
        <CommandGroup heading="Do">
          <CommandItem onSelect={go('/briefing')}><Radio className="mr-2 h-4 w-4" />Read today's briefing</CommandItem>
          <CommandItem onSelect={go('/blind-spot')}><Eye className="mr-2 h-4 w-4" />Reflect on a blind spot</CommandItem>
        </CommandGroup>

        {searching && (
          <>
            <CommandSeparator />
            <CommandGroup heading="More">
              <CommandItem onSelect={go('/dashboard?view=edge')}><Zap className="mr-2 h-4 w-4" />Edge</CommandItem>
              <CommandItem onSelect={go('/goals')}><Target className="mr-2 h-4 w-4" />Goals</CommandItem>
              <CommandItem onSelect={() => { onOpenChange(false); window.dispatchEvent(new CustomEvent('mm:capture-voice')) }}>
                <Mic className="mr-2 h-4 w-4" />Capture a thought (voice)
              </CommandItem>
              <CommandItem onSelect={() => { onOpenChange(false); window.dispatchEvent(new CustomEvent('mm:generate-briefing')) }}>
                <Zap className="mr-2 h-4 w-4" />Generate today's briefing
              </CommandItem>
            </CommandGroup>

            <CommandSeparator />
            <CommandGroup heading="Account">
              <CommandItem onSelect={go('/profile')}><User className="mr-2 h-4 w-4" />Profile</CommandItem>
              <CommandItem onSelect={go('/compliance')}><Shield className="mr-2 h-4 w-4" />Compliance</CommandItem>
              <CommandItem onSelect={go('/settings')}><Settings className="mr-2 h-4 w-4" />Settings</CommandItem>
              <CommandItem onSelect={() => { onOpenChange(false); void signOut() }}><LogOut className="mr-2 h-4 w-4" />Sign out</CommandItem>
            </CommandGroup>
          </>
        )}
      </CommandList>
    </CommandDialog>
  )
}
