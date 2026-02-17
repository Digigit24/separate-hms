// src/pages/Users.tsx
import React, { useState } from 'react';
import { useUser } from '@/hooks/useUser';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { DataTable, DataTableColumn } from '@/components/DataTable';
import UsersFormDrawer from '@/components/UsersFormDrawer';
import {
  Loader2,
  Plus,
  Search,
  Users as UsersIcon,
  UserCheck,
  UserX,
  Shield
} from 'lucide-react';
import { UserListParams, User } from '@/types/user.types';

export const Users: React.FC = () => {
  const { user: currentUser } = useAuth();
  const {
    useUsers,
    deleteUser,
  } = useUser();

  // State for search and filters
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState<boolean | ''>('');
  const [currentPage, setCurrentPage] = useState(1);

  // Drawer state
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [drawerMode, setDrawerMode] = useState<'view' | 'edit' | 'create'>('view');

  // Build query params
  const queryParams: UserListParams = {
    page: currentPage,
    search: searchTerm || undefined,
    is_active: activeFilter === '' ? undefined : activeFilter,
  };

  // Fetch users
  const {
    data: usersData,
    error: usersError,
    isLoading: usersLoading,
    mutate: mutateUsers
  } = useUsers(queryParams);

  const users = usersData?.results || [];
  const totalCount = usersData?.count || 0;
  const hasNext = !!usersData?.next;
  const hasPrevious = !!usersData?.previous;

  // Handlers
  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1); // Reset to first page
  };

  const handleActiveFilter = (active: boolean | '') => {
    setActiveFilter(active);
    setCurrentPage(1);
  };

  const handleView = (user: User) => {
    setSelectedUserId(user.id);
    setDrawerMode('view');
    setDrawerOpen(true);
  };

  const handleEdit = (user: User) => {
    setSelectedUserId(user.id);
    setDrawerMode('edit');
    setDrawerOpen(true);
  };

  const handleCreate = () => {
    setSelectedUserId(null);
    setDrawerMode('create');
    setDrawerOpen(true);
  };

  const handleDelete = async (user: User) => {
    try {
      await deleteUser(user.id);
      mutateUsers();
    } catch (error: any) {
      console.error('Delete failed:', error);
    }
  };

  const handleDrawerSuccess = () => {
    mutateUsers();
  };

  const handleDrawerDelete = () => {
    mutateUsers();
  };

  // DataTable columns configuration
  const columns: DataTableColumn<User>[] = [
    {
      header: 'User',
      key: 'name',
      cell: (user) => (
        <div className="flex flex-col">
          <span className="font-medium">{user.first_name} {user.last_name}</span>
          <span className="text-sm text-muted-foreground">{user.email}</span>
        </div>
      ),
    },
    {
      header: 'Phone',
      key: 'phone',
      cell: (user) => (
        <span className="text-sm">{user.phone || 'N/A'}</span>
      ),
    },
    {
      header: 'Roles',
      key: 'roles',
      cell: (user) => (
        <div className="flex flex-wrap gap-1">
          {(user.roles || []).slice(0, 2).map((role) => (
            <Badge key={role.id} variant="secondary" className="text-xs">
              {role.name}
            </Badge>
          ))}
          {(user.roles || []).length > 2 && (
            <Badge variant="outline" className="text-xs">
              +{(user.roles || []).length - 2}
            </Badge>
          )}
          {user.is_super_admin && (
            <Badge variant="default" className="text-xs bg-neutral-700 dark:bg-neutral-400">
              Super Admin
            </Badge>
          )}
        </div>
      ),
    },
    {
      header: 'Timezone',
      key: 'timezone',
      cell: (user) => (
        <span className="text-sm">{user.timezone || 'N/A'}</span>
      ),
    },
    {
      header: 'Status',
      key: 'status',
      cell: (user) => {
        return (
          <Badge variant="default" className={user.is_active ? 'bg-neutral-900 dark:bg-neutral-200' : 'bg-neutral-400 dark:bg-neutral-600'}>
            {user.is_active ? 'Active' : 'Inactive'}
          </Badge>
        );
      },
    },
  ];

  // Mobile card renderer
  const renderMobileCard = (user: User, actions: any) => {
    return (
      <>
        {/* Header Row */}
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-base truncate">
              {user.first_name} {user.last_name}
            </h3>
            <p className="text-sm text-muted-foreground truncate">{user.email}</p>
          </div>
          <Badge
            variant="default"
            className={user.is_active ? 'bg-neutral-900 dark:bg-neutral-200' : 'bg-neutral-400 dark:bg-neutral-600'}
          >
            {user.is_active ? 'Active' : 'Inactive'}
          </Badge>
        </div>

        {/* Phone */}
        {user.phone && (
          <div className="text-sm text-muted-foreground">
            Phone: {user.phone}
          </div>
        )}

        {/* Roles */}
        <div className="flex flex-wrap gap-1">
          {(user.roles || []).map((role) => (
            <Badge key={role.id} variant="secondary" className="text-xs">
              {role.name}
            </Badge>
          ))}
          {user.is_super_admin && (
            <Badge variant="default" className="text-xs bg-neutral-700 dark:bg-neutral-400">
              Super Admin
            </Badge>
          )}
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div>
            <p className="text-muted-foreground text-xs">Timezone</p>
            <p className="font-medium">{user.timezone || 'N/A'}</p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs">Tenant</p>
            <p className="font-medium">{user.tenant_name || 'N/A'}</p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 pt-2">
          {actions.view && (
            <Button size="sm" variant="outline" onClick={actions.view} className="flex-1">
              View
            </Button>
          )}
          {actions.edit && (
            <Button size="sm" variant="outline" onClick={actions.edit} className="flex-1">
              Edit
            </Button>
          )}
          {actions.askDelete && (
            <Button size="sm" variant="destructive" onClick={actions.askDelete}>
              Delete
            </Button>
          )}
        </div>
      </>
    );
  };

  return (
    <div className="p-4 md:p-5 w-full space-y-3">
      {/* Row 1: Title + inline stats + action */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4 flex-wrap">
          <h1 className="text-lg font-bold leading-none">Users</h1>
          <div className="hidden sm:flex items-center gap-3 text-[12px] text-muted-foreground">
            <span className="flex items-center gap-1"><UsersIcon className="h-3 w-3" /> <span className="font-semibold text-foreground">{totalCount}</span> total</span>
            <span className="text-border">|</span>
            <span className="flex items-center gap-1"><UserCheck className="h-3 w-3" /> <span className="font-semibold text-foreground">{users.filter((u) => u.is_active).length}</span> active</span>
            <span className="text-border">|</span>
            <span className="flex items-center gap-1"><UserX className="h-3 w-3" /> <span className="font-semibold text-foreground">{users.filter((u) => !u.is_active).length}</span> inactive</span>
            <span className="text-border">|</span>
            <span className="flex items-center gap-1"><Shield className="h-3 w-3" /> <span className="font-semibold text-foreground">{users.filter((u) => u.is_super_admin).length}</span> admins</span>
          </div>
        </div>
        <Button onClick={handleCreate} size="sm" className="w-full sm:w-auto h-7 text-[12px]">
          <Plus className="h-3.5 w-3.5 mr-1" />
          Add User
        </Button>
      </div>

      {/* Mobile-only stats */}
      <div className="flex sm:hidden items-center gap-3 text-[11px] text-muted-foreground flex-wrap">
        <span><span className="font-semibold text-foreground">{totalCount}</span> total</span>
        <span className="text-border">|</span>
        <span><span className="font-semibold text-foreground">{users.filter((u) => u.is_active).length}</span> active</span>
        <span className="text-border">|</span>
        <span><span className="font-semibold text-foreground">{users.filter((u) => !u.is_active).length}</span> inactive</span>
        <span className="text-border">|</span>
        <span><span className="font-semibold text-foreground">{users.filter((u) => u.is_super_admin).length}</span> admins</span>
      </div>

      {/* Row 2: Search + filters */}
      <div className="flex gap-2 items-center flex-wrap">
        <div className="relative w-full sm:w-52">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search..."
            value={searchTerm}
            onChange={handleSearch}
            className="pl-8 h-7 text-[12px]"
          />
        </div>
        <div className="flex gap-1 flex-wrap">
          <Button variant={activeFilter === '' ? 'default' : 'outline'} size="sm" className="h-7 text-[11px] px-2" onClick={() => handleActiveFilter('')}>All</Button>
          <Button variant={activeFilter === true ? 'default' : 'outline'} size="sm" className="h-7 text-[11px] px-2" onClick={() => handleActiveFilter(true)}>Active</Button>
          <Button variant={activeFilter === false ? 'default' : 'outline'} size="sm" className="h-7 text-[11px] px-2" onClick={() => handleActiveFilter(false)}>Inactive</Button>
        </div>
      </div>

      {/* Users Table */}
      <Card>
        <CardContent className="p-0">
          {usersError ? (
            <div className="p-8 text-center">
              <p className="text-destructive">{usersError.message}</p>
            </div>
          ) : (
            <>
              {usersLoading && <div className="flex justify-end px-4 py-2"><Loader2 className="h-4 w-4 animate-spin" /></div>}
              <DataTable
                rows={users}
                isLoading={usersLoading}
                columns={columns}
                renderMobileCard={renderMobileCard}
                getRowId={(user) => user.id}
                getRowLabel={(user) => `${user.first_name} ${user.last_name}`}
                onView={handleView}
                onEdit={handleEdit}
                onDelete={handleDelete}
                emptyTitle="No users found"
                emptySubtitle="Try adjusting your search or filters, or add a new user"
              />

              {/* Pagination */}
              {!usersLoading && users.length > 0 && (
                <div className="flex items-center justify-between px-6 py-4 border-t">
                  <p className="text-sm text-muted-foreground">
                    Showing {users.length} of {totalCount} user(s)
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={!hasPrevious}
                      onClick={() => setCurrentPage((p) => p - 1)}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={!hasNext}
                      onClick={() => setCurrentPage((p) => p + 1)}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Drawer */}
      <UsersFormDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        userId={selectedUserId}
        mode={drawerMode}
        onSuccess={handleDrawerSuccess}
        onDelete={handleDrawerDelete}
        onModeChange={(newMode) => setDrawerMode(newMode)}
      />
    </div>
  );
};
