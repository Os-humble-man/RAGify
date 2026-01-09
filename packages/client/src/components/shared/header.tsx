import {
   Asterisk,
   Bell,
   // Bell,
   // Globe,
   Moon,
   Settings,
   Sun,
} from 'lucide-react';
import {
   DropdownMenu,
   DropdownMenuContent,
   DropdownMenuItem,
   DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
// import { useState } from "react";
// import NotificationModal from "../modals/NotificationModal";
// import UserMenu from "../layout/UserMenu";
// import { Select, SelectContent, SelectItem, SelectTrigger } from "../ui/select";
import { useTheme } from './theme-provider';
import { useState } from 'react';

interface HeaderProps {
   currentView: string;
   isRagMode?: boolean;
   onRagModeChange?: (enabled: boolean) => void;
}

const chatbots = [
   { name: 'GPT-5', icon: '🤖' },
   { name: 'Claude Sonnet 4', icon: '🎭' },
   { name: 'Gemini', icon: '💎' },
   { name: 'Assistant', icon: <Asterisk className="h-4 w-4" /> },
];

export default function Header({
   // currentView,
   isRagMode = false,
   onRagModeChange,
}: HeaderProps) {
   const { setTheme, theme } = useTheme();
   const [selectedBot, setSelectedBot] = useState('GPT-5');
   //   const [openNotifications, setOpenNotifications] = useState(false);

   return (
      <header className="flex h-(--header-height) shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-(--header-height)">
         <div className="flex w-full items-center gap-1 px-4 lg:gap-2 lg:px-6 py-2">
            <SidebarTrigger className="-ml-1" />
            <Separator
               orientation="vertical"
               className="mx-2 data-[orientation=vertical]:h-4"
            />
            <DropdownMenu>
               <DropdownMenuTrigger
                  asChild
                  className="border-1 border-border/50 bg-popover/90 backdrop-blur-md rounded-md w-[100px] sm:w-[150px] px-2 sm:px-3 py-1 hover:bg-popover hover:shadow-md transition text-xs sm:text-sm"
               >
                  <Button
                     variant="ghost"
                     size="icon"
                     className="w-full justify-between"
                  >
                     <span className="truncate">{selectedBot}</span>{' '}
                     <span className="flex-shrink-0">
                        {chatbots.find((bot) => bot.name === selectedBot)?.icon}
                     </span>
                  </Button>
               </DropdownMenuTrigger>
               <DropdownMenuContent align="end">
                  {chatbots.map((bot) => (
                     <DropdownMenuItem
                        key={bot.name}
                        onClick={() => setSelectedBot(bot.name)}
                     >
                        {bot.icon} {bot.name}
                     </DropdownMenuItem>
                  ))}
               </DropdownMenuContent>
            </DropdownMenu>
            <div className="ml-auto flex items-center gap-1 sm:gap-2">
               {/* RAG Mode Switch */}
               <Label
                  htmlFor="rag-mode"
                  className="text-xs sm:text-sm font-medium cursor-pointer hidden sm:inline"
               >
                  RAG Mode
               </Label>
               <Switch
                  id="rag-mode"
                  checked={isRagMode}
                  onCheckedChange={onRagModeChange}
                  className="scale-75 sm:scale-100"
               />

               <Separator
                  orientation="vertical"
                  className="mx-1 data-[orientation=vertical]:h-4 hidden sm:block"
               />

               <div className="flex items-center gap-1 sm:gap-2">
                  <DropdownMenu>
                     <DropdownMenuTrigger asChild>
                        <Button
                           variant="ghost"
                           size="icon"
                           className="h-8 w-8 sm:h-10 sm:w-10"
                        >
                           {theme === 'light' ? (
                              <Sun className="w-4 h-4 sm:w-5 sm:h-5" />
                           ) : theme === 'dark' ? (
                              <Moon className="w-4 h-4 sm:w-5 sm:h-5" />
                           ) : (
                              <Settings className="w-4 h-4 sm:w-5 sm:h-5" />
                           )}
                        </Button>
                     </DropdownMenuTrigger>
                     <DropdownMenuContent align="end">
                        <DropdownMenuItem
                           className="gap-2"
                           onClick={() => setTheme('light')}
                        >
                           <Sun className="w-4 h-4" /> Light
                        </DropdownMenuItem>
                        <DropdownMenuItem
                           className="gap-2"
                           onClick={() => setTheme('dark')}
                        >
                           <Moon className="w-4 h-4" /> Dark
                        </DropdownMenuItem>
                        <DropdownMenuItem
                           className="gap-2"
                           onClick={() => setTheme('system')}
                        >
                           <Settings className="w-4 h-4" /> System
                        </DropdownMenuItem>
                     </DropdownMenuContent>
                  </DropdownMenu>

                  <Button
                     variant="ghost"
                     size="icon"
                     className="h-8 w-8 sm:h-10 sm:w-10 mr-1 sm:mr-0"
                     //   onClick={() => setOpenNotifications(true)}
                  >
                     <Bell className="w-4 h-4 sm:w-5 sm:h-5" />
                  </Button>

                  {/* <Select
              value={language}
              onValueChange={(value) => i18n.changeLanguage(value)}
            >
              <SelectTrigger className="w-auto border-0 bg-transparent p-2 h-auto">
                <Globe className="w-5 h-5" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="fr">Français</SelectItem>
                <SelectItem value="en">English</SelectItem>
              </SelectContent>
            </Select> */}
                  {/* <UserMenu /> */}
               </div>
            </div>
         </div>
         {/* <NotificationModal
        isOpen={openNotifications}
        setOpen={setOpenNotifications}
        notifications={[]}
      /> */}
      </header>
   );
}
