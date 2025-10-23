'use client'

import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import NotificationBell from '@/components/NotificationBell';
import { LogoutButton } from '@/components/auth/LogoutButton';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { 
  LayoutDashboard, 
  User, 
  FileText, 
  Plus, 
  FolderOpen,
  Clock,
  BookOpen,
  Upload,
  DollarSign,
  Users,
  Coins,
  BarChart3,
  MessageSquare,
  Bell
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface SidebarProps {
  userRole: 'student' | 'lecturer' | 'admin';
  className?: string;
}

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  variant?: 'default' | 'destructive';
}

export function Sidebar({ userRole, className }: SidebarProps) {
  const pathname = usePathname();

  const getNavItems = (): NavItem[] => {
    const commonItems: NavItem[] = [
      { href: `/${userRole}/dashboard`, label: 'Dashboard', icon: LayoutDashboard },
      { href: '/profile', label: 'Profile', icon: User },
    ];

    const roleSpecificItems: Record<string, NavItem[]> = {
      student: [
        { href: '/student/requests', label: 'My Requests', icon: FileText },
        { href: '/student/new-request', label: 'Request Letter', icon: Plus, variant: 'destructive' },
        { href: '/student/files', label: 'My Files', icon: FolderOpen },
      ],
      lecturer: [
        { href: '/lecturer/requests', label: 'Request Queue', icon: Clock },
        { href: '/lecturer/letters', label: 'My Letters', icon: BookOpen },
        { href: '/lecturer/sample-letters', label: 'Sample Letters', icon: Upload },
        { href: '/lecturer/earnings', label: 'Earnings', icon: DollarSign },
      ],
      admin: [
        { href: '/admin/users', label: 'User Management', icon: Users },
        { href: '/admin/tokens', label: 'Token Management', icon: Coins },
        { href: '/admin/analytics', label: 'Analytics', icon: BarChart3 },
        { href: '/admin/complaints', label: 'Complaints', icon: MessageSquare },
      ],
    };

    return [...commonItems, ...roleSpecificItems[userRole]];
  };

  const navItems = getNavItems();

  return (
    <div className={cn("flex h-full w-full flex-col bg-background border-r", className)}>
      {/* Logo/Brand - Hidden on mobile when in overlay */}
      <div className="hidden md:flex h-16 items-center px-6 border-b">
        <Link href="/" className="flex items-center space-x-2">
          <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
            <span className="text-primary-foreground font-bold text-sm">GR</span>
          </div>
          <span className="text-xl font-bold text-primary">GetReference</span>
        </Link>
      </div>

      {/* Navigation */}
      <nav 
        className="flex-1 space-y-2 p-4 overflow-y-auto" 
        role="navigation"
        aria-label="Main navigation"
      >
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || 
            (item.href !== `/${userRole}/dashboard` && pathname.startsWith(item.href));
          
          return (
            <Link key={item.href} href={item.href}>
              <Button
                variant={item.variant === 'destructive' ? 'destructive' : isActive ? 'secondary' : 'ghost'}
                className={cn(
                  "w-full justify-start gap-3 h-11 px-3",
                  "text-sm font-medium",
                  "transition-colors duration-200",
                  isActive && item.variant !== 'destructive' && "bg-secondary text-secondary-foreground",
                  !isActive && "hover:bg-accent hover:text-accent-foreground"
                )}
                aria-current={isActive ? 'page' : undefined}
                aria-label={`Navigate to ${item.label}`}
              >
                <Icon className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
                <span className="truncate">{item.label}</span>
              </Button>
            </Link>
          );
        })}
      </nav>

      {/* Bottom section */}
      <div className="border-t p-4 space-y-2">
        {/* Theme and Notification Controls */}
        <div className="flex items-center justify-center gap-2">
          <ThemeToggle />
          <NotificationBell />
        </div>
        
        {/* Logout Button */}
        <LogoutButton className="w-full" />
      </div>
    </div>
  );
}

// Export default for backward compatibility
export default Sidebar;