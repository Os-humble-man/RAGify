import {
   Asterisk,
   BadgeCheck,
   ChevronRight,
   ChevronsUpDown,
   DatabaseBackup,
   FileText,
   Folder,
   FolderHeart,
   LogOut,
   MessageSquarePlus,
   Search,
   Lock,
   Plus,
   FolderOpen,
} from 'lucide-react';
import {
   Sidebar,
   SidebarContent,
   SidebarFooter,
   SidebarGroup,
   SidebarGroupContent,
   SidebarHeader,
   SidebarMenu,
   SidebarMenuButton,
   SidebarMenuItem,
} from '../ui/sidebar';
// import { SearchForm } from '../search-form';
import { cn } from '@/lib/utils';
import {
   DropdownMenu,
   DropdownMenuContent,
   DropdownMenuGroup,
   DropdownMenuItem,
   DropdownMenuLabel,
   DropdownMenuSeparator,
   DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { useAuthStore } from '@/store/auth.store';
import { useIsMobile } from '@/hooks/use-mobile';
import { useAuth } from '@/hooks/use-auth';
import { useState } from 'react';
import {
   AlertDialog,
   AlertDialogAction,
   AlertDialogCancel,
   AlertDialogContent,
   AlertDialogDescription,
   AlertDialogFooter,
   AlertDialogHeader,
   AlertDialogTitle,
} from '../ui/alert-dialog';
import {
   Collapsible,
   CollapsibleContent,
   CollapsibleTrigger,
} from '@/components/ui/collapsible';

import { useConversations } from '@/hooks/queries/conversation.queries';
import { useNavigate } from 'react-router';
import {
   useToggleFavorite,
   useDeleteConversation,
} from '@/hooks/mutation/conversation.mutation';
import {
   useCreateFolder,
   // useUpdateFolder,
   // useDeleteFolder,
} from '@/hooks/mutation/folder.mutation';
import { useFolders } from '@/hooks/queries/folder.queries';
import { ConversationDropdownMenu } from './conversation-dropdown-menu';
import { InputDialog } from './input-dialog';
import { SearchDialog } from './search-dialog';
import { useMemo } from 'react';

const navigationItems = [
   {
      name: 'New chat',
      icon: MessageSquarePlus,
      hasCollapsableSection: false,
   },
   {
      name: 'Recent',
      icon: DatabaseBackup,
      hasCollapsableSection: true,
   },
   {
      name: 'Search chat',
      icon: Search,
      hasCollapsableSection: false,
   },
   {
      name: 'Favorites',
      icon: FolderHeart,
      hasCollapsableSection: true,
   },
   {
      name: 'Folders',
      icon: Folder,
      hasCollapsableSection: true,
   },
   {
      name: 'Templates',
      icon: FileText,
      hasCollapsableSection: true,
   },
];

export const AppSidebar = ({
   currentView,
   onViewChange,
}: {
   currentView: string;
   onViewChange: (view: string) => void;
}) => {
   // Sidebar implementation
   const { user } = useAuthStore();
   const { logout } = useAuth();
   const isMobile = useIsMobile();
   const [showLogoutDialog, setShowLogoutDialog] = useState(false);
   const [showDeleteDialog, setShowDeleteDialog] = useState(false);
   const [showCreateFolderDialog, setShowCreateFolderDialog] = useState(false);
   const [showCreateTemplateDialog, setShowCreateTemplateDialog] =
      useState(false);
   const [showSearchDialog, setShowSearchDialog] = useState(false);
   const [conversationToDelete, setConversationToDelete] = useState<
      string | null
   >(null);
   const navigation = useNavigate();
   const [openSections, setOpenSections] = useState<Record<string, boolean>>({
      recent: false,
      favorites: false,
      folders: false,
      templates: false,
   });
   const [selectedFolderId, setSelectedFolderId] = useState<string | null>(
      null
   );
   const { data: conversations, isLoading: isConversationsLoading } =
      useConversations(user?.id);
   const toggleFavoriteMutation = useToggleFavorite(user?.id);
   const deleteConversationMutation = useDeleteConversation(user?.id);
   const favoritesConversations = conversations?.filter(
      (item) => item.isFavorite === true
   );

   // Compter les conversations par dossier
   const folderConversationCounts = useMemo(() => {
      const counts: Record<string, number> = {};
      conversations?.forEach((conv) => {
         if (conv.folderId) {
            counts[conv.folderId] = (counts[conv.folderId] || 0) + 1;
         }
      });
      return counts;
   }, [conversations]);

   // Récupérer les conversations du dossier sélectionné
   const selectedFolderConversations = useMemo(() => {
      if (!selectedFolderId) return [];
      return (
         conversations?.filter((conv) => conv.folderId === selectedFolderId) ||
         []
      );
   }, [conversations, selectedFolderId]);

   // Folders hooks
   const { data: foldersData, isLoading: isFoldersLoading } = useFolders(
      user?.id!
   );
   const createFolderMutation = useCreateFolder();
   // const updateFolderMutation = useUpdateFolder();
   // const deleteFolderMutation = useDeleteFolder();

   const [templates, setTemplates] = useState([
      { id: '1', name: 'Code Review', uses: 12 },
      { id: '2', name: 'Meeting Notes', uses: 8 },
      { id: '3', name: 'Bug Report', uses: 15 },
   ]);

   const userInitials = user?.name
      ? user.name
           .split(' ')
           .map((n) => n[0])
           .slice(0, 2)
           .join('')
           .toUpperCase()
      : '';

   const handleLogoutClick = () => {
      setShowLogoutDialog(true);
   };

   const handleLogoutConfirm = async () => {
      setShowLogoutDialog(false);
      await logout();
   };

   const handleLogoutCancel = () => {
      setShowLogoutDialog(false);
   };

   const handleSelectConversation = (conversationId: string) => {
      navigation(`/chat/${conversationId}`);
   };

   const handleToggleFavorite = (
      e: React.MouseEvent,
      conversationId: string,
      isFavorite: boolean
   ) => {
      e.stopPropagation();
      toggleFavoriteMutation.mutate({
         conversationId,
         isFavorite: !isFavorite,
      });
   };

   const handleDeleteConversation = (
      e: React.MouseEvent,
      conversationId: string
   ) => {
      e.stopPropagation();
      setConversationToDelete(conversationId);
      setShowDeleteDialog(true);
   };

   const handleDeleteConfirm = () => {
      if (conversationToDelete) {
         deleteConversationMutation.mutate(conversationToDelete);
         setShowDeleteDialog(false);
         setConversationToDelete(null);
      }
   };

   const handleDeleteCancel = () => {
      setShowDeleteDialog(false);
      setConversationToDelete(null);
   };

   const handleCreateFolder = () => {
      setShowCreateFolderDialog(true);
   };

   const handleConfirmCreateFolder = (folderName: string) => {
      if (!user?.id) return;

      createFolderMutation.mutate({
         userId: user.id,
         name: folderName,
      });
   };

   const handleSelectFolder = (folderId: string) => {
      // Toggle: si le dossier est déjà sélectionné, le désélectionner
      if (selectedFolderId === folderId) {
         setSelectedFolderId(null);
      } else {
         setSelectedFolderId(folderId);
      }
   };

   const handleCreateTemplate = () => {
      setShowCreateTemplateDialog(true);
   };

   const handleConfirmCreateTemplate = (templateName: string) => {
      const newTemplate = {
         id: `${Date.now()}`,
         name: templateName,
         uses: 0,
      };
      setTemplates([...templates, newTemplate]);
   };

   const handleSelectTemplate = (templateId: string) => {
      // TODO: Implement template selection and use it
      console.log('Selected template ID:', templateId);
   };

   return (
      <Sidebar collapsible="icon">
         <SidebarHeader>
            <SidebarMenuButton
               size="lg"
               className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground "
            >
               <div className="flex items-center gap-2">
                  <div className="grid h-7 w-7 place-items-center rounded-md bg-blue-500 text-white shadow-sm dark:from-zinc-200 dark:to-zinc-300 dark:text-zinc-900">
                     <Asterisk className="h-4 w-4" />
                  </div>
                  <div className="text-sm font-semibold tracking-tight">
                     AI Assistant
                  </div>
               </div>
            </SidebarMenuButton>
         </SidebarHeader>
         <SidebarContent>
            <SidebarGroup>
               <SidebarGroupContent>
                  <SidebarMenu>
                     {navigationItems.map((item) => {
                        const sectionKey = item.name.toLowerCase();
                        const isOpen = openSections[sectionKey];

                        if (item.hasCollapsableSection) {
                           return (
                              <Collapsible
                                 key={item.name}
                                 open={isOpen}
                                 onOpenChange={(open) =>
                                    setOpenSections((prev) => ({
                                       ...prev,
                                       [sectionKey]: open,
                                    }))
                                 }
                                 className="group/collapsible"
                              >
                                 <SidebarMenuItem>
                                    <CollapsibleTrigger asChild>
                                       <SidebarMenuButton
                                          className={cn(
                                             currentView === sectionKey &&
                                                'bg-accent'
                                          )}
                                          tooltip={item.name}
                                       >
                                          <item.icon className="w-6 h-6" />
                                          <span className="group-data-[collapsible=icon]:hidden">
                                             {item.name}
                                          </span>
                                          <ChevronRight
                                             className={cn(
                                                'ml-auto h-4 w-4 transition-transform duration-200 group-data-[collapsible=icon]:hidden',
                                                isOpen && 'rotate-90'
                                             )}
                                          />
                                       </SidebarMenuButton>
                                    </CollapsibleTrigger>
                                    <CollapsibleContent>
                                       <div className="pl-8 pr-2 py-1 text-sm text-muted-foreground group-data-[collapsible=icon]:hidden">
                                          {sectionKey === 'recent' ? (
                                             isConversationsLoading ? (
                                                <p className="text-xs py-2">
                                                   Loading...
                                                </p>
                                             ) : conversations &&
                                               conversations.length > 0 ? (
                                                <div className="space-y-1">
                                                   {conversations
                                                      .slice(0, 5)
                                                      .map((conv) => (
                                                         <div
                                                            key={conv.id}
                                                            className="group/item flex items-center gap-1 w-full px-2 py-1.5 rounded-md hover:bg-accent transition-colors"
                                                         >
                                                            <button
                                                               className="flex-1 text-left text-xs truncate"
                                                               onClick={() =>
                                                                  handleSelectConversation(
                                                                     conv.id
                                                                  )
                                                               }
                                                            >
                                                               {conv.title ||
                                                                  'Untitled conversation'}
                                                            </button>
                                                            <div className="flex items-center opacity-0 group-hover/item:opacity-100 transition-opacity">
                                                               <ConversationDropdownMenu
                                                                  conversation={
                                                                     conv
                                                                  }
                                                                  onToggleFavorite={
                                                                     handleToggleFavorite
                                                                  }
                                                                  onDelete={
                                                                     handleDeleteConversation
                                                                  }
                                                                  folders={
                                                                     foldersData ||
                                                                     []
                                                                  }
                                                                  onCreateFolder={
                                                                     handleCreateFolder
                                                                  }
                                                                  userId={
                                                                     user?.id
                                                                  }
                                                               />
                                                            </div>
                                                         </div>
                                                      ))}
                                                </div>
                                             ) : (
                                                <p className="text-xs py-2">
                                                   No conversations yet
                                                </p>
                                             )
                                          ) : sectionKey === 'favorites' ? (
                                             isConversationsLoading ? (
                                                <p className="text-xs py-2">
                                                   Loading...
                                                </p>
                                             ) : favoritesConversations &&
                                               favoritesConversations.length >
                                                  0 ? (
                                                <div className="space-y-1">
                                                   {favoritesConversations.map(
                                                      (conv) => (
                                                         <div
                                                            key={conv.id}
                                                            className="group/item flex items-center gap-1 w-full px-2 py-1.5 rounded-md hover:bg-accent transition-colors"
                                                         >
                                                            <button
                                                               className="flex-1 text-left text-xs truncate"
                                                               onClick={() =>
                                                                  handleSelectConversation(
                                                                     conv.id
                                                                  )
                                                               }
                                                            >
                                                               {conv.title ||
                                                                  'Untitled conversation'}
                                                            </button>
                                                            <div className="flex items-center opacity-0 group-hover/item:opacity-100 transition-opacity">
                                                               <ConversationDropdownMenu
                                                                  conversation={
                                                                     conv
                                                                  }
                                                                  onToggleFavorite={
                                                                     handleToggleFavorite
                                                                  }
                                                                  onDelete={
                                                                     handleDeleteConversation
                                                                  }
                                                                  folders={
                                                                     foldersData ||
                                                                     []
                                                                  }
                                                                  onCreateFolder={
                                                                     handleCreateFolder
                                                                  }
                                                                  userId={
                                                                     user?.id
                                                                  }
                                                               />
                                                            </div>
                                                         </div>
                                                      )
                                                   )}
                                                </div>
                                             ) : (
                                                <p className="text-xs py-2">
                                                   No favorite conversations yet
                                                </p>
                                             )
                                          ) : sectionKey === 'folders' ? (
                                             <div className="space-y-1">
                                                {/* Create New Folder Button */}
                                                <button
                                                   onClick={handleCreateFolder}
                                                   className="flex items-center gap-2 w-full px-2 py-1.5 rounded-md hover:bg-accent transition-colors text-xs font-medium"
                                                >
                                                   <Plus className="h-4 w-4" />
                                                   Create new folder
                                                </button>

                                                {/* Folders List */}
                                                {isFoldersLoading ? (
                                                   <p className="text-xs py-2 px-2">
                                                      Loading folders...
                                                   </p>
                                                ) : foldersData &&
                                                  foldersData.length > 0 ? (
                                                   foldersData.map((folder) => {
                                                      const conversationCount =
                                                         folderConversationCounts[
                                                            folder.id
                                                         ] || 0;
                                                      const isSelected =
                                                         selectedFolderId ===
                                                         folder.id;

                                                      return (
                                                         <div
                                                            key={folder.id}
                                                            className="space-y-1"
                                                         >
                                                            {/* Folder Item */}
                                                            <div
                                                               className={cn(
                                                                  'group/item flex items-center gap-2 w-full px-2 py-1.5 rounded-md hover:bg-accent transition-colors cursor-pointer',
                                                                  isSelected &&
                                                                     'bg-accent'
                                                               )}
                                                               onClick={() =>
                                                                  handleSelectFolder(
                                                                     folder.id
                                                                  )
                                                               }
                                                            >
                                                               <FolderOpen className="h-4 w-4 flex-shrink-0" />
                                                               <span className="flex-1 text-xs truncate">
                                                                  {folder.name}
                                                               </span>
                                                               {conversationCount >
                                                                  0 && (
                                                                  <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-xs font-medium text-primary-foreground">
                                                                     {
                                                                        conversationCount
                                                                     }
                                                                  </span>
                                                               )}
                                                            </div>

                                                            {/* Conversations in Folder */}
                                                            {isSelected &&
                                                               selectedFolderConversations.length >
                                                                  0 && (
                                                                  <div className="ml-6 space-y-1 border-l pl-2">
                                                                     {selectedFolderConversations.map(
                                                                        (
                                                                           conv
                                                                        ) => (
                                                                           <div
                                                                              key={
                                                                                 conv.id
                                                                              }
                                                                              className="group/conv flex items-center gap-1 w-full px-2 py-1.5 rounded-md hover:bg-accent/50 transition-colors"
                                                                           >
                                                                              <button
                                                                                 className="flex-1 text-left text-xs truncate"
                                                                                 onClick={(
                                                                                    e
                                                                                 ) => {
                                                                                    e.stopPropagation();
                                                                                    handleSelectConversation(
                                                                                       conv.id
                                                                                    );
                                                                                 }}
                                                                              >
                                                                                 {conv.title ||
                                                                                    'Untitled conversation'}
                                                                              </button>
                                                                              <div className="flex items-center opacity-0 group-hover/conv:opacity-100 transition-opacity">
                                                                                 <ConversationDropdownMenu
                                                                                    conversation={
                                                                                       conv
                                                                                    }
                                                                                    onToggleFavorite={
                                                                                       handleToggleFavorite
                                                                                    }
                                                                                    onDelete={
                                                                                       handleDeleteConversation
                                                                                    }
                                                                                    folders={
                                                                                       foldersData ||
                                                                                       []
                                                                                    }
                                                                                    onCreateFolder={
                                                                                       handleCreateFolder
                                                                                    }
                                                                                    userId={
                                                                                       user?.id
                                                                                    }
                                                                                 />
                                                                              </div>
                                                                           </div>
                                                                        )
                                                                     )}
                                                                  </div>
                                                               )}

                                                            {/* Empty state when folder is selected but has no conversations */}
                                                            {isSelected &&
                                                               selectedFolderConversations.length ===
                                                                  0 && (
                                                                  <p className="ml-6 text-xs py-2 px-2 text-muted-foreground">
                                                                     No
                                                                     conversations
                                                                     in this
                                                                     folder
                                                                  </p>
                                                               )}
                                                         </div>
                                                      );
                                                   })
                                                ) : (
                                                   <p className="text-xs py-2 px-2 text-muted-foreground">
                                                      No folders yet
                                                   </p>
                                                )}
                                             </div>
                                          ) : sectionKey === 'templates' ? (
                                             <div className="space-y-1">
                                                {/* Create New Template Button */}
                                                <button
                                                   onClick={
                                                      handleCreateTemplate
                                                   }
                                                   className="flex items-center gap-2 w-full px-2 py-1.5 rounded-md hover:bg-accent transition-colors text-xs font-medium"
                                                >
                                                   <Plus className="h-4 w-4" />
                                                   Create new template
                                                </button>

                                                {/* Templates List */}
                                                {templates.length > 0 ? (
                                                   templates.map((template) => (
                                                      <div
                                                         key={template.id}
                                                         className="group/item flex items-center gap-2 w-full px-2 py-1.5 rounded-md hover:bg-accent transition-colors cursor-pointer"
                                                         onClick={() =>
                                                            handleSelectTemplate(
                                                               template.id
                                                            )
                                                         }
                                                      >
                                                         <FileText className="h-4 w-4 flex-shrink-0" />
                                                         <span className="flex-1 text-xs truncate">
                                                            {template.name}
                                                         </span>
                                                         <span className="text-xs text-muted-foreground">
                                                            {template.uses}
                                                         </span>
                                                      </div>
                                                   ))
                                                ) : (
                                                   <p className="text-xs py-2 px-2 text-muted-foreground">
                                                      No templates yet
                                                   </p>
                                                )}
                                             </div>
                                          ) : (
                                             <p className="text-xs py-2">
                                                No items yet
                                             </p>
                                          )}
                                       </div>
                                    </CollapsibleContent>
                                 </SidebarMenuItem>
                              </Collapsible>
                           );
                        }

                        return (
                           <SidebarMenuItem key={item.name}>
                              <SidebarMenuButton
                                 asChild
                                 className={cn(
                                    currentView === sectionKey && 'bg-accent'
                                 )}
                                 tooltip={item.name}
                              >
                                 <p
                                    onClick={() => {
                                       if (sectionKey === 'new chat') {
                                          navigation('/');
                                       } else if (
                                          sectionKey === 'search chat'
                                       ) {
                                          setShowSearchDialog(true);
                                       } else {
                                          onViewChange(sectionKey);
                                       }
                                    }}
                                 >
                                    <item.icon className="w-6 h-6" />
                                    <span className="group-data-[collapsible=icon]:hidden">
                                       {item.name}
                                    </span>
                                 </p>
                              </SidebarMenuButton>
                           </SidebarMenuItem>
                        );
                     })}
                  </SidebarMenu>
               </SidebarGroupContent>
            </SidebarGroup>
         </SidebarContent>

         <SidebarFooter>
            {user && (
               <SidebarMenu>
                  <SidebarMenuItem>
                     <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                           <SidebarMenuButton
                              size="lg"
                              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                           >
                              <Avatar className="h-8 w-8 rounded-lg">
                                 <AvatarImage
                                    src={user.avatarUrl}
                                    alt={user.name}
                                 />
                                 <AvatarFallback className="rounded-lg">
                                    {userInitials}
                                 </AvatarFallback>
                              </Avatar>
                              <div className="grid flex-1 text-left text-sm leading-tight">
                                 <span className="truncate font-medium">
                                    {user.name}
                                 </span>
                                 <span className="truncate text-xs">
                                    {user.email}
                                 </span>
                              </div>
                              <ChevronsUpDown className="ml-auto size-4" />
                           </SidebarMenuButton>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent
                           className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
                           side={isMobile ? 'bottom' : 'right'}
                           align="end"
                           sideOffset={4}
                        >
                           <DropdownMenuLabel className="p-0 font-normal">
                              <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                                 <Avatar className="h-8 w-8 rounded-lg">
                                    <AvatarImage
                                       src={user.avatarUrl}
                                       alt={user.name}
                                    />
                                    <AvatarFallback className="rounded-lg">
                                       {userInitials}
                                    </AvatarFallback>
                                 </Avatar>
                                 <div className="grid flex-1 text-left text-sm leading-tight">
                                    <span className="truncate font-medium">
                                       {user.name}
                                    </span>
                                    <span className="truncate text-xs">
                                       {user.email}
                                    </span>
                                 </div>
                              </div>
                           </DropdownMenuLabel>
                           <DropdownMenuSeparator />
                           <DropdownMenuGroup>
                              <DropdownMenuItem>
                                 <BadgeCheck />
                                 Account
                              </DropdownMenuItem>
                              <DropdownMenuItem
                              // onClick={() => navigate('/change-password')}
                              >
                                 <Lock />
                                 Change Password
                              </DropdownMenuItem>
                           </DropdownMenuGroup>
                           <DropdownMenuSeparator />
                           <DropdownMenuItem
                              variant="destructive"
                              onClick={handleLogoutClick}
                           >
                              <LogOut />
                              Log out
                           </DropdownMenuItem>
                        </DropdownMenuContent>
                     </DropdownMenu>
                  </SidebarMenuItem>
               </SidebarMenu>
            )}
         </SidebarFooter>

         {/* Logout Confirmation Dialog */}
         <AlertDialog
            open={showLogoutDialog}
            onOpenChange={setShowLogoutDialog}
         >
            <AlertDialogContent>
               <AlertDialogHeader>
                  <AlertDialogTitle>
                     Are you sure you want to logout?
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                     You will be logged out of your account and redirected to
                     the login page.
                  </AlertDialogDescription>
               </AlertDialogHeader>
               <AlertDialogFooter>
                  <AlertDialogCancel onClick={handleLogoutCancel}>
                     Cancel
                  </AlertDialogCancel>
                  <AlertDialogAction onClick={handleLogoutConfirm}>
                     Logout
                  </AlertDialogAction>
               </AlertDialogFooter>
            </AlertDialogContent>
         </AlertDialog>

         {/* Delete Confirmation Dialog */}
         <AlertDialog
            open={showDeleteDialog}
            onOpenChange={setShowDeleteDialog}
         >
            <AlertDialogContent>
               <AlertDialogHeader>
                  <AlertDialogTitle>Delete conversation?</AlertDialogTitle>
                  <AlertDialogDescription>
                     This action cannot be undone. This will permanently delete
                     the conversation and all its messages.
                  </AlertDialogDescription>
               </AlertDialogHeader>
               <AlertDialogFooter>
                  <AlertDialogCancel onClick={handleDeleteCancel}>
                     Cancel
                  </AlertDialogCancel>
                  <AlertDialogAction
                     onClick={handleDeleteConfirm}
                     className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                     Delete
                  </AlertDialogAction>
               </AlertDialogFooter>
            </AlertDialogContent>
         </AlertDialog>

         {/* Create Folder Dialog */}
         <InputDialog
            open={showCreateFolderDialog}
            onOpenChange={setShowCreateFolderDialog}
            title="Create New Folder"
            description="Enter a name for your new folder to organize your conversations."
            inputLabel="Folder Name"
            inputPlaceholder="e.g., Work, Personal, Projects"
            onConfirm={handleConfirmCreateFolder}
            confirmText="Create Folder"
         />

         {/* Create Template Dialog */}
         <InputDialog
            open={showCreateTemplateDialog}
            onOpenChange={setShowCreateTemplateDialog}
            title="Create New Template"
            description="Enter a name for your new template to reuse conversation patterns."
            inputLabel="Template Name"
            inputPlaceholder="e.g., Code Review, Bug Report"
            onConfirm={handleConfirmCreateTemplate}
            confirmText="Create Template"
         />

         {/* Search Dialog */}
         <SearchDialog
            open={showSearchDialog}
            onOpenChange={setShowSearchDialog}
            conversations={conversations || []}
            onSelectConversation={handleSelectConversation}
         />
      </Sidebar>
   );
};
